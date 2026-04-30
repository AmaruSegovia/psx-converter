import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { setHeaderStatus } from '@/lib/headerStatus';
import { useTranslation } from '@/hooks/useTranslation';
import { useConverterStore } from '@/store/converterStore';
import { useLospecAPI } from '@/hooks/useLospecAPI';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HexColorPicker } from 'react-colorful';
import { BUILTIN_PALETTES } from '@/data/builtinPalettes';
import { hexToColor, parsePaletteFile, exportPaletteHex, exportPaletteGPL, exportPaletteJSON } from '@/lib/paletteParser';
import type { PaletteColor } from '@/types';
import type { TranslationKey } from '@/lib/i18n';

import { InfoTip } from '@/components/ui/info-tip';

const sv = (val: number | readonly number[]) => Array.isArray(val) ? val[0] : val;

export function TabPalette() {
  const { t } = useTranslation();
  const settings = useConverterStore((s) => s.settings);
  const updateSettings = useConverterStore((s) => s.updateSettings);
  const generatedPalette = useConverterStore((s) => s.generatedPalette);
  const setGeneratedPalette = useConverterStore((s) => s.setGeneratedPalette);
  const { fetchPalette, loading: lospecLoading, errorCode: lospecErrorCode } = useLospecAPI();
  const [lospecSlug, setLospecSlug] = useState(settings.lospecSlug);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const isGenerated = settings.paletteSource === 'generated';
  const hasCustomPalette = settings.palette.length > 0;
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // What to display in swatches: generated colors (read from store) or custom palette
  const displayPalette = isGenerated ? generatedPalette : settings.palette;
  const hasDisplayPalette = displayPalette.length > 0;
  const selectedColor = selectedColorIdx !== null ? (displayPalette[selectedColorIdx] ?? null) : null;
  const pickerRef = useRef<HTMLDivElement>(null);

  // Promote auto-generated palette to editable custom palette
  const promoteToCustom = useCallback((base: PaletteColor[]) => {
    updateSettings({
      palette: base.map(c => ({ ...c })),
      paletteSource: 'custom',
      colorCount: base.length,
    });
  }, [updateSettings]);

  // Click outside picker to close
  useEffect(() => {
    if (selectedColorIdx === null) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setSelectedColorIdx(null);
      }
    };
    // Delay to avoid closing immediately from the swatch click
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [selectedColorIdx]);

  const handleLospecImport = useCallback(async () => {
    const colors = await fetchPalette(lospecSlug);
    if (colors) {
      updateSettings({
        palette: colors,
        paletteSource: 'lospec',
        lospecSlug,
        colorCount: colors.length,
      });
      setHeaderStatus(t('toast.lospecImported', { count: colors.length }));
    }
  }, [lospecSlug, fetchPalette, updateSettings, t]);

  const handleBuiltinSelect = useCallback((slug: string | null) => {
    if (!slug) return;
    const pal = BUILTIN_PALETTES.find((p) => p.slug === slug);
    if (pal) {
      const colors = pal.colors.map(hexToColor);
      updateSettings({
        palette: colors,
        paletteSource: 'builtin',
        colorCount: colors.length,
      });
      setHeaderStatus(t('toast.presetLoaded', { name: pal.name }));
    }
  }, [updateSettings, t]);

  const handleClearPalette = useCallback(() => {
    updateSettings({
      palette: [],
      paletteSource: 'generated',
    });
    setSelectedColorIdx(null);
  }, [updateSettings]);

  const handleHexChange = useCallback((hex: string) => {
    if (selectedColorIdx === null || settings.palette.length === 0) return;
    const newPalette = [...settings.palette];
    newPalette[selectedColorIdx] = hexToColor(hex);
    updateSettings({ palette: newPalette });
  }, [selectedColorIdx, settings.palette, updateSettings]);

  const handleDeleteColor = useCallback(() => {
    if (selectedColorIdx === null || settings.palette.length === 0) return;
    const newPalette = settings.palette.filter((_, i) => i !== selectedColorIdx);
    updateSettings({ palette: newPalette, colorCount: newPalette.length });
    setSelectedColorIdx(null);
  }, [selectedColorIdx, settings.palette, updateSettings]);

  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  const handleEyeDropper = useCallback(async () => {
    if (!hasEyeDropper) return;
    try {
      // @ts-expect-error EyeDropper API not in all TS libs
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      const color = hexToColor(result.sRGBHex);
      const base = isGenerated ? generatedPalette : settings.palette;

      if (selectedColorIdx !== null && settings.palette.length > 0) {
        // Replace selected color
        const newPalette = [...settings.palette];
        newPalette[selectedColorIdx] = color;
        updateSettings({ palette: newPalette });
        setHeaderStatus(t('toast.colorPicked', { hex: color.hex }));
      } else {
        // Add to palette (promotes from generated if needed)
        updateSettings({
          palette: [...base.map(c => ({ ...c })), color],
          paletteSource: 'custom',
          colorCount: base.length + 1,
        });
        setHeaderStatus(t('toast.colorAdded', { hex: color.hex }));
      }
    } catch {
      // User cancelled
    }
  }, [hasEyeDropper, selectedColorIdx, isGenerated, generatedPalette, settings.palette, updateSettings, t]);

  const handleFileImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.hex,.pal,.gpl';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        const colors = parsePaletteFile(file.name, content);
        if (colors.length > 0) {
          updateSettings({
            palette: colors,
            paletteSource: 'custom',
            colorCount: colors.length,
          });
          setHeaderStatus(t('toast.fileImported', { count: colors.length }));
        } else {
          toast.error(t('toast.noColors'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [updateSettings, t]);

  return (
    <div className="space-y-5">
      {/* Palette swatches — shown for both custom and auto-generated palettes */}
      {hasDisplayPalette && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[11px]">
              {isGenerated ? t('palette.generatedColors') : t('palette.colors')} ({displayPalette.length})
            </Label>
            {hasCustomPalette && (
              <button
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                onClick={handleClearPalette}
              >
                {t('palette.clear')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1" role="listbox" aria-label={t('palette.colors')}>
            <AnimatePresence mode="popLayout">
              {displayPalette.map((c: PaletteColor, i: number) => (
                <motion.button
                  key={i}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`w-6 h-6 rounded border-2 transition-shadow ${
                    selectedColorIdx === i ? 'border-white' : 'border-transparent'
                  } ${dragOverIdx === i && dragFromIdx !== i ? 'ring-2 ring-primary' : ''} ${
                    dragFromIdx === i ? 'opacity-40' : ''
                  }`}
                  style={{ backgroundColor: c.hex }}
                  role="option"
                  aria-selected={selectedColorIdx === i}
                  aria-label={c.hex}
                  draggable={hasCustomPalette}
                  // Framer's motion.button shadows native DnD handler types.
                  // Cast through unknown so React still wires the native event listeners.
                  {...({
                    onDragStart: (e: React.DragEvent<HTMLButtonElement>) => {
                      if (!hasCustomPalette) return;
                      setDragFromIdx(i);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(i));
                    },
                    onDragOver: (e: React.DragEvent<HTMLButtonElement>) => {
                      if (!hasCustomPalette || dragFromIdx === null) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIdx !== i) setDragOverIdx(i);
                    },
                    onDragLeave: () => {
                      if (dragOverIdx === i) setDragOverIdx(null);
                    },
                    onDrop: (e: React.DragEvent<HTMLButtonElement>) => {
                      if (!hasCustomPalette || dragFromIdx === null) return;
                      e.preventDefault();
                      const from = dragFromIdx;
                      const to = i;
                      if (from !== to) {
                        const next = [...settings.palette];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        updateSettings({ palette: next });
                        setSelectedColorIdx(to);
                      }
                      setDragFromIdx(null);
                      setDragOverIdx(null);
                    },
                    onDragEnd: () => {
                      setDragFromIdx(null);
                      setDragOverIdx(null);
                    },
                  } as unknown as Record<string, unknown>)}
                  onClick={() => {
                    if (isGenerated) promoteToCustom(generatedPalette);
                    setSelectedColorIdx(selectedColorIdx === i ? null : i);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      if (hasCustomPalette) {
                        e.preventDefault();
                        const newPalette = settings.palette.filter((_, idx) => idx !== i);
                        updateSettings({ palette: newPalette, colorCount: newPalette.length });
                        setSelectedColorIdx(null);
                      }
                    }
                  }}
                  title={c.hex}
                />
              ))}
              {/* Add color button */}
              <motion.button
                layout
                key="add-color"
                className="w-6 h-6 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/40 hover:border-primary/50 hover:text-primary transition-colors"
                onClick={() => {
                  const base = isGenerated ? generatedPalette : settings.palette;
                  const newColor = hexToColor('#808080');
                  const newPalette = [...base.map(c => ({ ...c })), newColor];
                  updateSettings({
                    palette: newPalette,
                    paletteSource: 'custom',
                    colorCount: newPalette.length,
                  });
                  setSelectedColorIdx(base.length);
                }}
                title={t('palette.addColor')}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </motion.button>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Palette export */}
      {hasDisplayPalette && (
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" className="text-[11px] w-full" />}>
            {t('palette.exportTitle')}
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>{t('palette.exportTitle')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t('palette.exportFormat')}</p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  exportPaletteHex(displayPalette);
                  setHeaderStatus(t('toast.paletteExported'));
                  setExportDialogOpen(false);
                }}
              >
                Hex <span className="text-muted-foreground font-mono text-xs ml-1">(.hex)</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  exportPaletteGPL(displayPalette, 'PSX');
                  setHeaderStatus(t('toast.paletteExported'));
                  setExportDialogOpen(false);
                }}
              >
                GIMP Palette <span className="text-muted-foreground font-mono text-xs ml-1">(.gpl)</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  exportPaletteJSON(displayPalette);
                  setHeaderStatus(t('toast.paletteExported'));
                  setExportDialogOpen(false);
                }}
              >
                JSON <span className="text-muted-foreground font-mono text-xs ml-1">(.json)</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Color picker */}
      <AnimatePresence>
      {selectedColor && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
        <div
          className="space-y-3 p-3 bg-muted rounded-lg relative"
          ref={pickerRef}
        >
          {/* Close button */}
          <button
            className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSelectedColorIdx(null)}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <HexColorPicker
            color={selectedColor.hex}
            onChange={handleHexChange}
            style={{ width: '100%', height: 150 }}
          />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border border-border shrink-0" style={{ backgroundColor: selectedColor.hex }} />
            <input
              className="w-20 text-[11px] font-mono text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:text-primary outline-none transition-colors"
              defaultValue={selectedColor.hex}
              key={selectedColorIdx + '-' + selectedColor.hex}
              onBlur={(e) => {
                let v = e.target.value.trim();
                if (!v.startsWith('#')) v = '#' + v;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) handleHexChange(v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              maxLength={7}
            />
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              {selectedColor.r}, {selectedColor.g}, {selectedColor.b}
            </span>
            {hasEyeDropper && (
              <button
                onClick={handleEyeDropper}
                className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0"
                title={t('palette.pickScreen')}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M2 22l1-1h3l9-9M17.5 2.5a2.121 2.121 0 013 3L12 14l-4 1 1-4z" />
                </svg>
              </button>
            )}
            {hasCustomPalette && (
              <button
                onClick={handleDeleteColor}
                className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors shrink-0"
                title={t('palette.removeColor')}
                aria-label={t('palette.removeColor')}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Color count + k-means — only when generating palette from image */}
      {isGenerated && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px]">{t('palette.colorCount')}</Label>
                <InfoTip text={t('palette.colorCountTip')} />
              </div>
              <span className="text-[11px] text-muted-foreground">{settings.colorCount}</span>
            </div>
            <Slider
              value={[settings.colorCount]}
              onValueChange={(val) => updateSettings({ colorCount: sv(val) })}
              min={2}
              max={64}
              step={1}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="kmeans"
              checked={settings.useKMeansPlusPlus}
              onCheckedChange={(v) => updateSettings({ useKMeansPlusPlus: !!v })}
            />
            <Label htmlFor="kmeans" className="text-[11px]">{t('palette.kmeans')}</Label>
            <InfoTip text={t('palette.kmeansTip')} />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {hasCustomPalette ? (
          <Button size="sm" variant="outline" className="text-[11px] flex-1" onClick={handleClearPalette}>
            {t('palette.autoGenerate')}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="text-[11px] flex-1" onClick={handleFileImport}>
            {t('palette.importFile')}
          </Button>
        )}
        {hasEyeDropper && (
          <Button size="sm" variant="outline" className="text-[11px]" onClick={handleEyeDropper}
            title={selectedColorIdx !== null ? t('palette.pickReplace') : t('palette.pickAdd')}>
            <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M2 22l1-1h3l9-9M17.5 2.5a2.121 2.121 0 013 3L12 14l-4 1 1-4z" />
            </svg>
            {t('palette.pick')}
          </Button>
        )}
      </div>

      {/* Lospec import */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <Label className="text-[11px]">{t('palette.lospec')}</Label>
          <InfoTip text={t('palette.lospecTip')} />
        </div>
        <div className="flex gap-2">
          <Input
            value={lospecSlug}
            onChange={(e) => setLospecSlug(e.target.value)}
            placeholder={t('palette.lospecPlaceholder')}
            className="h-9 text-[11px]"
            onKeyDown={(e) => e.key === 'Enter' && handleLospecImport()}
          />
          <Button size="sm" className="text-[11px]" onClick={handleLospecImport} disabled={lospecLoading}>
            {lospecLoading ? '...' : t('palette.import')}
          </Button>
        </div>
        {lospecErrorCode && <p className="text-[11px] text-destructive">{t(`lospec.error.${lospecErrorCode}` as TranslationKey)}</p>}
      </div>

      {/* Builtin palettes */}
      <div className="space-y-2 pt-2 border-t border-border">
        <Label className="text-[11px]">{t('palette.builtin')}</Label>
        <Select onValueChange={handleBuiltinSelect}>
          <SelectTrigger className="h-9 text-[11px]">
            <SelectValue placeholder={t('palette.builtinPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {BUILTIN_PALETTES.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* PSX 555 hardware mode */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <Label className="text-[11px]">{t('palette.hardware')}</Label>
          <InfoTip text={t('palette.psx555Tip')} />
        </div>
        <Button
          size="sm"
          variant={settings.paletteSource === 'psx555' ? 'default' : 'outline'}
          className="text-[11px] w-full h-9"
          onClick={() => {
            // Clear the displayed palette so users don't see stale colors
            // (PSX 555 emits hundreds-thousands of unique 5-bit colors that
            // would linger until the next full pipeline tick — ~400ms).
            setGeneratedPalette([]);
            if (settings.paletteSource === 'psx555') {
              updateSettings({ paletteSource: 'generated' });
            } else {
              updateSettings({
                paletteSource: 'psx555',
                palette: [],
                lospecSlug: '',
              });
              setSelectedColorIdx(null);
            }
          }}
          aria-pressed={settings.paletteSource === 'psx555'}
        >
          {settings.paletteSource === 'psx555' ? t('palette.psx555Disable') : t('palette.psx555')}
        </Button>
        {settings.paletteSource === 'psx555' && (
          <p className="text-[10px] text-muted-foreground/70">{t('palette.psx555Hint')}</p>
        )}
      </div>
    </div>
  );
}
