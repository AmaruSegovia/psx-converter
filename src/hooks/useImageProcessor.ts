import { useEffect, useRef, useState } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { useDebounce } from './useDebounce';
import {
  processFastPreview,
  processFastQuantPreview,
  processFullPipeline,
  getCachedPreview,
} from '@/lib/imageProcessing';
import { publishCanvas } from '@/lib/canvasBus';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

export function useImageProcessor() {
  const settings = useConverterStore((s) => s.settings);
  const sourceImage = useConverterStore((s) => s.sourceImage);
  const setResult = useConverterStore((s) => s.setResult);
  const setIsProcessing = useConverterStore((s) => s.setIsProcessing);
  const setGeneratedPalette = useConverterStore((s) => s.setGeneratedPalette);

  const fullSettings = useDebounce(settings, 400);
  const rafRef = useRef(0);
  const previewGenRef = useRef(0);
  const fullGenRef = useRef(0);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);

  // Pre-cache source when it changes
  useEffect(() => {
    if (!sourceImage) {
      setSourceCanvas(null);
      setResult(null);
      return;
    }
    getCachedPreview(sourceImage).then(setSourceCanvas);
  }, [sourceImage, setResult]);

  // 3-tier preview:
  //   Tier 1 — rAF, sync, pre-quant (flash so canvas isn't empty)
  //   Tier 2 — async worker, quantized at 256 with frozen palette (fidelity)
  //   Tier 3 — debounced 400 ms, full pipeline at real target (see effect below)
  useEffect(() => {
    if (!sourceCanvas || !sourceImage) return;

    const gen = ++previewGenRef.current;
    cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (previewGenRef.current !== gen) return;
      try {
        const tier1 = processFastPreview(sourceCanvas, settings);
        if (previewGenRef.current === gen && tier1.width > 0 && tier1.height > 0) {
          publishCanvas(tier1);
        }
      } catch (err) {
        console.error('Fast preview error:', err);
      }
    });

    // Tier 2 — fires in parallel, replaces tier 1 when it lands (~50-120ms).
    // Superseded by newer drags via latest-wins in quantizationClient.
    processFastQuantPreview(sourceCanvas, settings, sourceImage).then((canvas) => {
      if (!canvas) return;
      if (previewGenRef.current !== gen) return;
      publishCanvas(canvas);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [settings, sourceCanvas, sourceImage]);

  // Tier 3 — full quality, debounced. Separate gen so a drag mid-pipeline
  // doesn't strand isProcessing at true.
  useEffect(() => {
    if (!sourceImage) return;

    const gen = ++fullGenRef.current;
    setIsProcessing(true);

    (async () => {
      try {
        const { resultCanvas, generatedPalette } = await processFullPipeline(sourceImage, fullSettings);
        if (fullGenRef.current !== gen) return;
        publishCanvas(resultCanvas);
        setResult(null, resultCanvas.width, resultCanvas.height);
        setGeneratedPalette(generatedPalette);
      } catch (err) {
        console.error('Processing error:', err);
        if (fullGenRef.current === gen) toast.error(t('toast.processingFailed'));
      } finally {
        if (fullGenRef.current === gen) {
          setIsProcessing(false);
        }
      }
    })();
  }, [fullSettings, sourceImage, setResult, setIsProcessing, setGeneratedPalette]);
}
