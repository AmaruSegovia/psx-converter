import { useEffect, useRef, useState } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { useDebounce } from './useDebounce';
import { processFastPreview, processFullPipeline, getCachedPreview } from '@/lib/imageProcessing';
import { publishCanvas } from '@/lib/canvasBus';
import { toast } from 'sonner';

export function useImageProcessor() {
  const settings = useConverterStore((s) => s.settings);
  const sourceImage = useConverterStore((s) => s.sourceImage);
  const setResult = useConverterStore((s) => s.setResult);
  const setIsProcessing = useConverterStore((s) => s.setIsProcessing);

  const fullSettings = useDebounce(settings, 400);
  const rafRef = useRef(0);
  const genRef = useRef(0);
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

  // Instant preview — fires on every settings or source change
  useEffect(() => {
    if (!sourceCanvas) return;

    const gen = ++genRef.current;
    cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (genRef.current !== gen) return;

      try {
        const result = processFastPreview(sourceCanvas, settings);
        if (genRef.current === gen && result && result.width > 0 && result.height > 0) {
          publishCanvas(result);
        }
      } catch (err) {
        console.error('Fast preview error:', err);
      }
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [settings, sourceCanvas]);

  // Full quality — debounced, with quantization
  useEffect(() => {
    if (!sourceImage) return;

    // Capture gen AFTER fast preview has set its value
    const gen = genRef.current;
    setIsProcessing(true);

    processFullPipeline(sourceImage, fullSettings)
      .then(({ resultBase64, resultCanvas }) => {
        // Apply if no newer settings change happened
        if (genRef.current === gen) {
          publishCanvas(resultCanvas);
          setResult(resultBase64, resultCanvas.width, resultCanvas.height);
          setIsProcessing(false);
        }
      })
      .catch((err) => {
        console.error('Processing error:', err);
        if (genRef.current === gen) {
          setIsProcessing(false);
          toast.error('Processing failed');
        }
      });
  }, [fullSettings, sourceImage, setResult, setIsProcessing]);
}
