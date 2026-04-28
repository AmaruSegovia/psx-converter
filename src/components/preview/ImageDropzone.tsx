import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useConverterStore } from '@/store/converterStore';
import { loadImage } from '@/lib/imageProcessing';
import { fitDimsToSource } from '@/lib/aspectFit';
import { EXAMPLE_IMAGES } from '@/data/examples';
import type { ConverterSettings, ExampleImage } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

/**
 * Effects-related fields. If any differ from defaults, the user has
 * customized — loading an example must NOT clobber their setup.
 */
const EFFECT_KEYS: (keyof ConverterSettings)[] = [
  'sampleMode', 'blurAmount', 'sharpenAmount',
  'alphaThreshold', 'transparencyMode', 'colorKeyHex',
  'distanceMetric', 'ditherMode', 'ditherAmount',
  'colorCount', 'useKMeansPlusPlus', 'paletteSource', 'lospecSlug',
  'posterize', 'brightness', 'contrast', 'saturation', 'hue', 'gamma',
  'tintRed', 'tintGreen', 'tintBlue',
  'crtEnabled', 'crtScanlines', 'crtRgbShift', 'crtVignette',
  'grainAmount', 'grainSeedLocked',
  'levelsInLow', 'levelsInHigh', 'levelsOutLow', 'levelsOutHigh',
];

function hasCustomEffects(s: ConverterSettings): boolean {
  if (s.palette.length > 0) return true;
  return EFFECT_KEYS.some((k) => s[k] !== DEFAULT_SETTINGS[k]);
}

export function ImageDropzone() {
  const { t } = useTranslation();
  const sourceImage = useConverterStore((s) => s.sourceImage);
  const setSourceImage = useConverterStore((s) => s.setSourceImage);
  const setOriginalDimensions = useConverterStore((s) => s.setOriginalDimensions);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingName, setLoadingName] = useState('');

  const updateSettings = useConverterStore((s) => s.updateSettings);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.invalidFile'));
      return;
    }

    setIsLoading(true);
    setLoadingName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        setSourceImage(base64, file.name);
        const img = await loadImage(base64);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setOriginalDimensions(w, h);

        const settings = useConverterStore.getState().settings;
        if (settings.sizeMode === 'absolute') {
          const fitted = fitDimsToSource({
            width: settings.width,
            height: settings.height,
            lockAspect: settings.lockAspect,
            sourceWidth: w,
            sourceHeight: h,
          });
          updateSettings(fitted);
        } else {
          updateSettings({ width: 100, height: 100 });
        }

        toast.success(`${t('toast.imageLoaded')} (${w} x ${h}px)`);
      } catch {
        toast.error(t('dropzone.loadError'));
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setIsLoading(false);
      toast.error(t('dropzone.loadError'));
    };
    reader.readAsDataURL(file);
  }, [setSourceImage, setOriginalDimensions, updateSettings, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  const handleExampleLoad = useCallback(async (ex: ExampleImage) => {
    setIsLoading(true);
    setLoadingName(ex.name);
    try {
      const url = `${import.meta.env.BASE_URL}examples/${ex.filename}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const b64 = e.target?.result as string;
          setSourceImage(b64, ex.name);
          const img = await loadImage(b64);
          const iw = img.naturalWidth;
          const ih = img.naturalHeight;
          setOriginalDimensions(iw, ih);

          const currentSettings = useConverterStore.getState().settings;
          const userHasCustomized = hasCustomEffects(currentSettings);

          // If the user already configured effects (preset applied, sliders moved),
          // loading an example must only swap the IMAGE — never overwrite their setup.
          // Examples' suggestedSettings only apply on a clean/default config.
          let suggested: Partial<ConverterSettings> = userHasCustomized
            ? {}
            : { ...ex.suggestedSettings };

          const targetMode = suggested.sizeMode ?? currentSettings.sizeMode;
          const lockAspect = suggested.lockAspect ?? currentSettings.lockAspect;

          if (targetMode === 'absolute') {
            if (lockAspect) {
              const fitted = fitDimsToSource({
                width: currentSettings.width,
                height: currentSettings.height,
                lockAspect: true,
                sourceWidth: iw,
                sourceHeight: ih,
              });
              suggested = { ...suggested, width: fitted.width, height: fitted.height };
            } else {
              if (suggested.width !== undefined) suggested.width = Math.min(suggested.width, iw);
              if (suggested.height !== undefined) suggested.height = Math.min(suggested.height, ih);
            }
          }

          updateSettings(suggested);
          toast.success(t('dropzone.exampleLoaded'));
        } catch {
          toast.error(t('dropzone.exampleError'));
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setIsLoading(false);
        toast.error(t('dropzone.exampleError'));
      };
      reader.readAsDataURL(blob);
    } catch {
      setIsLoading(false);
      toast.error(t('dropzone.exampleError'));
    }
  }, [setSourceImage, setOriginalDimensions, updateSettings, t]);

  if (sourceImage) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center canvas-checkerboard overflow-y-auto py-6 gap-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onDrop={isLoading ? undefined : handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={isLoading ? undefined : handleClick}
        whileHover={isLoading ? undefined : { scale: 1.02 }}
        className={`
          flex flex-col items-center justify-center gap-4
          w-[340px] h-[300px] rounded-xl
          border-2 border-dashed transition-colors duration-200
          bg-card/60 backdrop-blur-sm
          ${isLoading
            ? 'border-primary/40 cursor-wait'
            : isDragOver
              ? 'border-primary bg-primary/5 cursor-pointer'
              : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-card/80 cursor-pointer'
          }
        `}
      >
        {isLoading ? (
          <>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-primary/15">
              <svg className="w-7 h-7 text-primary animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm text-foreground/70 font-medium">{t('dropzone.loading')}</p>
              <p className="text-[11px] text-muted-foreground/50 mt-1 truncate max-w-[280px]">{loadingName}</p>
            </div>
          </>
        ) : (
          <>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${isDragOver ? 'bg-primary/15' : 'bg-muted/50'}`}>
              <svg className={`w-7 h-7 transition-colors ${isDragOver ? 'text-primary' : 'text-muted-foreground/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-sm text-foreground/70 font-medium">
                {isDragOver ? t('dropzone.dropActive') : t('dropzone.drop')}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">{t('dropzone.browse')}</p>
            </div>

            <div className="flex gap-1.5 mt-1">
              {['PNG', 'JPG', 'BMP', 'WebP'].map((ext) => (
                <span key={ext} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground/50 font-mono">
                  {ext}
                </span>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Examples gallery */}
      <div className="text-center">
        <p className="text-[9px] text-muted-foreground/30 mb-3 uppercase tracking-widest">
          {t('dropzone.examples')}
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          {EXAMPLE_IMAGES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleExampleLoad(ex)}
              className="group flex flex-col items-center gap-1 hover:scale-105 transition-transform"
            >
              <div className="w-12 h-12 rounded border border-border/30 overflow-hidden bg-muted/20 group-hover:border-primary/40 transition-colors">
                <img
                  src={`${import.meta.env.BASE_URL}examples/${ex.filename}`}
                  alt={ex.name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
                {ex.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
