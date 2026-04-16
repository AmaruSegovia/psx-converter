import { useEffect, useRef, useState } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PresetCard } from './PresetCard';
import { FACTORY_PRESETS } from '@/data/factoryPresets';
import { processFullPipeline } from '@/lib/imageProcessing';
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
    savePreset(name.trim());
    toast.success(`Preset "${name.trim()}" saved`);
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

// Module-level cache: sourceImage base64 → Map<presetId, thumbnailBase64>
const thumbCache = new Map<string, Map<string, string>>();
const THUMB_MAX = 128;

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

  const thumbDims = dimsFromAspect(originalWidth, originalHeight, THUMB_MAX);
  // Clamp display aspect so portrait images don't blow up card height.
  // Thumbnail itself keeps its real aspect; object-cover crops the overflow.
  const displayAspect = Math.max(0.85, Math.min(1.3, thumbDims.aspect));

  useEffect(() => {
    if (!open || !sourceImage) {
      if (!sourceImage) setPreviews({});
      return;
    }

    const cached = thumbCache.get(sourceImage);
    if (cached) {
      setPreviews(Object.fromEntries(cached));
      return;
    }

    setPreviews({});
    if (computingRef.current) return;
    computingRef.current = true;

    let cancelled = false;
    const map = new Map<string, string>();
    const { w: thumbW, h: thumbH } = thumbDims;

    (async () => {
      for (const preset of FACTORY_PRESETS) {
        if (cancelled) break;
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
      if (!cancelled) thumbCache.set(sourceImage, map);
      computingRef.current = false;
    })();

    return () => {
      cancelled = true;
      computingRef.current = false;
    };
  }, [open, sourceImage, thumbDims.w, thumbDims.h]);

  const handleLoadUser = (id: string, name: string) => {
    setPendingHistoryLabel(`Preset: ${name}`);
    loadPreset(id);
    toast.success(`Loaded "${name}"`);
    setOpen(false);
  };

  const handleLoadFactory = (settings: ConverterSettings, name: string) => {
    setPendingHistoryLabel(`Preset: ${name}`);
    // Adapt preset dims to current source aspect at preset's native pixel scale.
    // Matches thumbnail's aspect-preserving render so loaded result ≈ preview.
    const maxDim = presetMaxDim(settings);
    const { w, h } = dimsFromAspect(originalWidth, originalHeight, maxDim);
    loadSettings({ ...settings, width: w, height: h, sizeMode: 'absolute' });
    toast.success(`Loaded "${name}"`);
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
            <div className="grid grid-cols-3 gap-3">
              {FACTORY_PRESETS.map((p) => (
                <PresetCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  description={p.description}
                  thumbnail={previews[p.id]}
                  thumbnailColors={p.thumbnailColors}
                  aspectRatio={displayAspect}
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
