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

  // Instant preview — fires on every settings or source change
  useEffect(() => {
    if (!sourceCanvas) return;

    const gen = ++previewGenRef.current;
    cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (previewGenRef.current !== gen) return;

      try {
        const result = processFastPreview(sourceCanvas, settings);
        if (previewGenRef.current === gen && result.width > 0 && result.height > 0) {
          publishCanvas(result);
        }
      } catch (err) {
        console.error('Fast preview error:', err);
      }
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [settings, sourceCanvas]);

  // Full quality — debounced, with quantization.
  // Separate gen from fast preview so a slider drag mid-pipeline doesn't
  // strand isProcessing at true.
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
        if (fullGenRef.current === gen) toast.error('Processing failed');
      } finally {
        // Only clear if no newer pipeline has started; otherwise the newer
        // one will clear it when it finishes.
        if (fullGenRef.current === gen) {
          setIsProcessing(false);
        }
      }
    })();
  }, [fullSettings, sourceImage, setResult, setIsProcessing, setGeneratedPalette]);
}
