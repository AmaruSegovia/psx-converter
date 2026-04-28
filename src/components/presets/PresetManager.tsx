import { useEffect, useRef, useState } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PresetCard } from './PresetCard';
import { FACTORY_PRESETS } from '@/data/factoryPresets';
import { processFullPipeline } from '@/lib/imageProcessing';
import { clearLastPalette } from '@/lib/quantizationClient';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { setPendingHistoryLabel } from '@/hooks/useUndoRedo';
import type { ConverterSettings } from '@/types';

export function PresetSaveDialog() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const savePreset = useConverterStore((s) => s.savePreset);

  const handleSave = () => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    savePreset(trimmed);
    toast.success(t('toast.presetSaved', { name: trimmed }));
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="text-xs" />}>
        {t('preset.save')}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('preset.saveTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('preset.namePlaceholder')}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <Button size="sm" onClick={handleSave}>{t('preset.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Module-level cache. Key = `${sourceImage}|${srcW}x${srcH}|${PRESET_SIG}`.
// Including source dims invalidates stale entries when those change; the
// preset signature invalidates when the factory list shifts (add/remove/dim).
// Without these, switching aspect or editing a preset returns wrong thumbs
// from a prior session run.
const PRESET_SIG = FACTORY_PRESETS
  .map((p) => `${p.id}:${p.settings.width}x${p.settings.height}:${p.settings.lockAspect ? 1 : 0}`)
  .join(',');
const thumbCache = new Map<string, Map<string, string>>();
function cacheKey(src: string, w: number, h: number): string {
  return `${src}|${w}x${h}|${PRESET_SIG}`;
}

function dimsFromAspect(srcW: number, srcH: number, maxDim: number): { w: number; h: number; aspect: number } {
  if (srcW <= 0 || srcH <= 0) return { w: maxDim, h: maxDim, aspect: 1 };
  const aspect = srcW / srcH;
  let w: number, h: number;
  if (aspect >= 1) {
    w = maxDim;
    h = Math.max(1, Math.round(maxDim / aspect));
  } else {
    h = maxDim;
    w = Math.max(1, Math.round(maxDim * aspect));
  }
  return { w, h, aspect };
}

/** Native max-dim the preset was designed around (e.g. GameBoy 160, N64 64). */
function presetMaxDim(settings: ConverterSettings): number {
  return Math.max(settings.width, settings.height);
}

/** Compute the dims a preset will produce when applied to the current source.
 * Mirrors handleLoadFactory's logic so thumbnails preview the actual result. */
function presetTargetDims(
  settings: ConverterSettings,
  srcW: number,
  srcH: number,
): { w: number; h: number } {
  if (settings.lockAspect && srcW > 0 && srcH > 0) {
    const { w, h } = dimsFromAspect(srcW, srcH, presetMaxDim(settings));
    return { w, h };
  }
  return { w: settings.width, h: settings.height };
}

export function PresetLoadDialog() {
  const { t } = useTranslation();
  const presets = useConverterStore((s) => s.presets);
  const loadPreset = useConverterStore((s) => s.loadPreset);
  const loadSettings = useConverterStore((s) => s.loadSettings);
  const sourceImage = useConverterStore((s) => s.sourceImage);
  const originalWidth = useConverterStore((s) => s.originalWidth);
  const originalHeight = useConverterStore((s) => s.originalHeight);
  const [open, setOpen] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const computingRef = useRef(false);

  // Each card uses its OWN aspect (the dims the preset will actually produce).
  // GameBoy is locked at 160×144 → its card is 1.11. PSX is source-aspect.
  // No global displayAspect — letterbox/stretch would distort the preview.
  const aspectFor = (settings: ConverterSettings): number => {
    const { w, h } = presetTargetDims(settings, originalWidth, originalHeight);
    return h > 0 ? w / h : 1;
  };

  useEffect(() => {
    if (!open || !sourceImage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!sourceImage) setPreviews({});
      return;
    }

    const ck = cacheKey(sourceImage, originalWidth, originalHeight);
    const cached = thumbCache.get(ck);
    if (cached) {
      setPreviews(Object.fromEntries(cached));
      return;
    }

    setPreviews({});
    if (computingRef.current) return;
    computingRef.current = true;

    let cancelled = false;
    const map = new Map<string, string>();

    (async () => {
      for (const preset of FACTORY_PRESETS) {
        if (cancelled) break;
        // Use the SAME dims the preset will produce when applied. Otherwise
        // thumbnail at 128px ≠ live result at e.g. 64px (N64) or 160×144 (GB).
        const { w: thumbW, h: thumbH } = presetTargetDims(
          preset.settings, originalWidth, originalHeight,
        );
        const thumbSettings: ConverterSettings = {
          ...preset.settings,
          width: thumbW,
          height: thumbH,
          sizeMode: 'absolute',
        };
        try {
          const { resultCanvas } = await processFullPipeline(sourceImage, thumbSettings);
          if (cancelled) break;
          const base64 = resultCanvas.toDataURL('image/png');
          map.set(preset.id, base64);
          setPreviews((prev) => ({ ...prev, [preset.id]: base64 }));
        } catch {
          /* skip failed preset */
        }
      }
      if (!cancelled) thumbCache.set(ck, map);
      computingRef.current = false;
    })();

    return () => {
      cancelled = true;
      computingRef.current = false;
    };
  }, [open, sourceImage, originalWidth, originalHeight]);

  const handleLoadUser = (id: string, name: string) => {
    setPendingHistoryLabel(`Preset: ${name}`);
    // Tier-2 reuses the last full-pipeline palette. After thumbnail generation
    // ran ALL presets, _lastPalette holds whichever preset was processed last,
    // not the one we're applying. Clear so tier-2 samples fresh and matches
    // tier-3 (and the dialog thumbnail).
    clearLastPalette();
    // If user-preset has lockAspect, re-derive dims for current source so the
    // saved long-side maps onto the loaded image's aspect ratio.
    const userPreset = presets.find((p) => p.id === id);
    if (userPreset && userPreset.settings.lockAspect && originalWidth > 0) {
      const maxDim = presetMaxDim(userPreset.settings);
      const { w, h } = dimsFromAspect(originalWidth, originalHeight, maxDim);
      loadSettings({ ...userPreset.settings, width: w, height: h, sizeMode: 'absolute' });
    } else {
      loadPreset(id);
    }
    toast.success(t('toast.presetLoaded', { name }));
    setOpen(false);
  };

  const handleLoadFactory = (settings: ConverterSettings, name: string) => {
    setPendingHistoryLabel(`Preset: ${name}`);
    clearLastPalette();
    if (settings.lockAspect && originalWidth > 0) {
      // Adapt preset dims to current source aspect at preset's native pixel scale.
      const maxDim = presetMaxDim(settings);
      const { w, h } = dimsFromAspect(originalWidth, originalHeight, maxDim);
      loadSettings({ ...settings, width: w, height: h, sizeMode: 'absolute' });
    } else {
      // lockAspect=false: keep preset's literal dims (e.g. GameBoy 160×144).
      loadSettings(settings);
    }
    toast.success(t('toast.presetLoaded', { name }));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="text-xs" />}>
        {t('preset.load')}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('preset.loadTitle')}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-5">
          {/* Factory presets */}
          <div>
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-2">
              {t('preset.factory')}
            </p>
            <div className="grid grid-cols-3 gap-3 items-start">
              {FACTORY_PRESETS.map((p) => (
                <PresetCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  description={p.description}
                  thumbnail={previews[p.id]}
                  thumbnailColors={p.thumbnailColors}
                  aspectRatio={aspectFor(p.settings)}
                  isFactory
                  isLoading={!!sourceImage && !previews[p.id]}
                  onClick={() => handleLoadFactory(p.settings, p.name)}
                />
              ))}
            </div>
          </div>

          {/* User presets */}
          <div>
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-2">
              {t('preset.userPresets')}
            </p>
            {presets.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-4 text-center">{t('preset.noPresets')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {presets.map((p) => (
                  <div key={p.id} onClick={() => handleLoadUser(p.id, p.name)}>
                    <PresetCard
                      id={p.id}
                      name={p.name}
                      thumbnail={p.thumbnail}
                      createdAt={p.createdAt}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
