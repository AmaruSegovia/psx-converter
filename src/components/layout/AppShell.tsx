import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useConverterStore } from '@/store/converterStore';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useTranslation } from '@/hooks/useTranslation';
import { exportPNG, loadImage, processFullPipeline, upscaleNearestNeighbor } from '@/lib/imageProcessing';
import { buildIndexedPng, downloadIndexedPng } from '@/lib/exportIndexedPng';
import { subscribeCanvas, getResultDimensions } from '@/lib/canvasBus';
import { onWorkerCrash } from '@/lib/quantizationClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from './Sidebar';
import { ImageDropzone } from '@/components/preview/ImageDropzone';
import { PreviewCanvas } from '@/components/preview/PreviewCanvas';
import { BeforeAfterSlider } from '@/components/preview/BeforeAfterSlider';
import { FACTORY_PRESETS } from '@/data/factoryPresets';
import { setPendingHistoryLabel } from '@/hooks/useUndoRedo';
import type { ConverterSettings } from '@/types';

export function AppShell() {
  useImageProcessor();
  const { t, locale, setLocale } = useTranslation();

  const sourceImage = useConverterStore((s) => s.sourceImage);
  const isProcessing = useConverterStore((s) => s.isProcessing);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider'>('slider');
  const [hasResult, setHasResult] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [batchSizes, setBatchSizesRaw] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('psx-batch-sizes');
      if (!raw) return [32, 64, 128, 256];
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
        return parsed as number[];
      }
    } catch { /* ignore */ }
    return [32, 64, 128, 256];
  });
  const setBatchSizes = useCallback((next: number[] | ((prev: number[]) => number[])) => {
    setBatchSizesRaw((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem('psx-batch-sizes', JSON.stringify(value)); } catch { /* private mode */ }
      return value;
    });
  }, []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const [paletteChoice, setPaletteChoice] = useState<'keep' | 'regen'>('keep');
  const [restorePrompt, setRestorePrompt] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [previewBg, setPreviewBg] = useState<'checkerboard' | 'black' | 'white' | 'custom' | 'image'>('checkerboard');
  const [previewBgCustom, setPreviewBgCustom] = useState<string>('#1a1525');
  const [previewBgImage, setPreviewBgImage] = useState<string | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Export scale (nearest-neighbor multiplier applied AFTER pipeline). Local
  // state — not in ConverterSettings because it's a delivery concern, not
  // processing. Persisted to localStorage so user's last choice survives
  // refresh.
  const [exportScale, setExportScaleRaw] = useState<number>(() => {
    try {
      const v = parseInt(localStorage.getItem('psx-export-scale') || '1', 10);
      return Number.isFinite(v) ? Math.max(1, Math.min(32, v)) : 1;
    } catch { return 1; }
  });
  const setExportScale = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(32, Math.floor(n)));
    setExportScaleRaw(clamped);
    try { localStorage.setItem('psx-export-scale', String(clamped)); } catch { /* private mode */ }
  }, []);
  const [customScaleMode, setCustomScaleMode] = useState(false);
  const [customScaleInput, setCustomScaleInput] = useState('');

  const SCALE_PRESETS = [1, 2, 3, 4, 6, 8, 10, 16];
  const isPresetScale = SCALE_PRESETS.includes(exportScale);

  const EXPORT_PIXEL_LIMIT = 50_000_000;

  const [exportIndexed, setExportIndexedRaw] = useState<boolean>(() => {
    try { return localStorage.getItem('psx-export-indexed') === 'true'; }
    catch { return false; }
  });
  const setExportIndexed = useCallback((v: boolean) => {
    setExportIndexedRaw(v);
    try { localStorage.setItem('psx-export-indexed', String(v)); } catch { /* private mode */ }
  }, []);

  const commitCustomScale = useCallback(() => {
    const n = parseInt(customScaleInput, 10);
    if (Number.isFinite(n)) setExportScale(n);
    setCustomScaleMode(false);
  }, [customScaleInput, setExportScale]);

  // --- Smart filename ---
  const getExportFilename = useCallback((w?: number, h?: number) => {
    const store = useConverterStore.getState();
    const name = store.sourceFileName || 'psx-texture';
    const { w: rw, h: rh } = getResultDimensions();
    const fw = w ?? rw;
    const fh = h ?? rh;
    return fw && fh ? `${name}_psx_${fw}x${fh}.png` : `${name}_psx.png`;
  }, []);

  // --- Handlers ---
  const handleRemoveImage = () => {
    useConverterStore.getState().setSourceImage('');
    useConverterStore.getState().setResult(null);
    import('@/lib/sourceStorage').then((m) => m.clearSource());
    setShowRemoveDialog(false);
    setHasResult(false);
    toast.success(t('toast.imageRemoved'));
  };

  // Export ALWAYS runs the full pipeline so output matches the final preview
  // exactly. getResultCanvas() may still be holding a Tier 1/2 intermediate
  // (low-res, no quant or frozen palette) if the user clicks during the 400ms
  // debounce — using it here would silently ship the wrong image.
  const handleExport = useCallback(async () => {
    const source = useConverterStore.getState().sourceImage;
    if (!source) { toast.error(t('toast.noResult')); return; }
    const settings = useConverterStore.getState().settings;
    try {
      const { resultCanvas } = await processFullPipeline(source, settings);
      const targetPixels = resultCanvas.width * resultCanvas.height * exportScale * exportScale;
      if (targetPixels > EXPORT_PIXEL_LIMIT) {
        toast.error(t('toast.exportTooLarge'));
        return;
      }
      const finalCanvas = upscaleNearestNeighbor(resultCanvas, exportScale);
      const filename = getExportFilename(finalCanvas.width, finalCanvas.height);
      const palette = useConverterStore.getState().generatedPalette;
      const canIndexed = exportIndexed && palette.length > 0 && palette.length <= 256;
      const ok = canIndexed
        ? downloadIndexedPng(finalCanvas, palette, filename)
        : false;
      if (!ok) {
        exportPNG(finalCanvas, filename);
      }
      toast.success(t('toast.exported'));
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(t('toast.processingFailed'));
    }
  }, [t, getExportFilename, exportScale, exportIndexed]);

  const handleCopy = useCallback(async () => {
    const source = useConverterStore.getState().sourceImage;
    if (!source) { toast.error(t('toast.noResult')); return; }
    const settings = useConverterStore.getState().settings;
    try {
      // ClipboardItem accepts a Promise<Blob> — the browser keeps the user
      // gesture alive while the pipeline runs. Avoids "not allowed" failures
      // in Safari when await between click and clipboard.write takes too long.
      const blobPromise = processFullPipeline(source, settings).then(
        ({ resultCanvas }) => {
          const targetPixels = resultCanvas.width * resultCanvas.height * exportScale * exportScale;
          if (targetPixels > EXPORT_PIXEL_LIMIT) {
            throw new Error('export-too-large');
          }
          const finalCanvas = upscaleNearestNeighbor(resultCanvas, exportScale);
          return new Promise<Blob>((res, rej) =>
            finalCanvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png')
          );
        }
      );
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
      toast.success(t('toast.copied'));
    } catch (err) {
      console.error('Copy failed:', err);
      if (err instanceof Error && err.message === 'export-too-large') {
        toast.error(t('toast.exportTooLarge'));
      } else {
        toast.error(t('toast.copyFailed'));
      }
    }
  }, [t, exportScale]);

  const handleBatchExport = useCallback(async () => {
    const source = useConverterStore.getState().sourceImage;
    const settings = useConverterStore.getState().settings;
    if (!source) return;

    setBatchExporting(true);
    const failedSizes: number[] = [];
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const { originalWidth: ow, originalHeight: oh } = useConverterStore.getState();
      const aspect = ow > 0 && oh > 0 ? ow / oh : 1;
      for (const size of batchSizes) {
        try {
          // Treat `size` as longest side; derive short side from aspect.
          const w = aspect >= 1 ? size : Math.max(1, Math.round(size * aspect));
          const h = aspect >= 1 ? Math.max(1, Math.round(size / aspect)) : size;
          const batchSettings = { ...settings, width: w, height: h, sizeMode: 'absolute' as const };
          const { resultCanvas } = await processFullPipeline(source, batchSettings);
          const targetPixels = resultCanvas.width * resultCanvas.height * exportScale * exportScale;
          if (targetPixels > EXPORT_PIXEL_LIMIT) {
            failedSizes.push(size);
            continue;
          }
          const finalCanvas = upscaleNearestNeighbor(resultCanvas, exportScale);
          const filename = getExportFilename(finalCanvas.width, finalCanvas.height);
          const palette = useConverterStore.getState().generatedPalette;
          const canIndexed = exportIndexed && palette.length > 0 && palette.length <= 256;
          let payload: Blob | ArrayBuffer;
          if (canIndexed) {
            try {
              payload = buildIndexedPng(finalCanvas, palette);
            } catch {
              payload = await new Promise<Blob>((res, rej) =>
                finalCanvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png')
              );
            }
          } else {
            payload = await new Promise<Blob>((res, rej) =>
              finalCanvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png')
            );
          }
          zip.file(filename, payload);
        } catch (err) {
          console.error(`Batch export failed for size ${size}:`, err);
          failedSizes.push(size);
        }
      }
      if (failedSizes.length === batchSizes.length) {
        toast.error(t('toast.zipFailed'));
        return;
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const storeName = useConverterStore.getState().sourceFileName || 'psx-texture';
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${storeName}_batch.zip`;
      a.click();
      URL.revokeObjectURL(url);
      if (failedSizes.length > 0) {
        toast.warning(`${t('toast.zipExported')} — ${t('toast.zipSkipped')}: ${failedSizes.join(', ')}`);
      } else {
        toast.success(t('toast.zipExported'));
      }
    } catch (err) {
      console.error('Batch export failed:', err);
      toast.error(t('toast.zipFailed'));
    } finally {
      setBatchExporting(false);
      setShowBatchExport(false);
    }
  }, [batchSizes, getExportFilename, t, exportScale, exportIndexed]);

  const loadDroppedFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target?.result as string;
        const store = useConverterStore.getState();
        store.setSourceImage(base64, file.name);
        // Persist the original blob so a refresh can offer to restore it.
        // Fire-and-forget: failures fall back to no-restore UX.
        import('@/lib/sourceStorage').then((m) => m.saveSource(file, file.name));
        const img = await loadImage(base64);
        store.setOriginalDimensions(img.naturalWidth, img.naturalHeight);
        const s = store.settings;
        if (s.sizeMode === 'absolute') {
          store.updateSettings({
            width: Math.min(img.naturalWidth, s.width),
            height: Math.min(img.naturalHeight, s.height),
          });
        } else {
          store.updateSettings({ width: 100, height: 100 });
        }
        toast.success(`${t('toast.imageLoaded')} (${img.naturalWidth} x ${img.naturalHeight}px)`);
      } catch {
        toast.error(t('dropzone.loadError'));
      }
    };
    reader.onerror = () => toast.error(t('dropzone.loadError'));
    reader.readAsDataURL(file);
  }, [t]);

  // --- Drop on preview (replace image) ---
  const handleDropOnPreview = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    setPendingReplaceFile(file);
  }, []);

  const handleConfirmReplace = useCallback(() => {
    if (pendingReplaceFile) {
      loadDroppedFile(pendingReplaceFile);
      if (paletteChoice === 'regen') {
        useConverterStore.getState().updateSettings({
          palette: [],
          paletteSource: 'generated',
          lospecSlug: '',
        });
      }
    }
    setPendingReplaceFile(null);
    setPaletteChoice('keep');
  }, [pendingReplaceFile, loadDroppedFile, paletteChoice]);

  // --- Effects ---
  const [resultDims, setResultDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const exportTooLarge = resultDims.w > 0 &&
    resultDims.w * resultDims.h * exportScale * exportScale > EXPORT_PIXEL_LIMIT;
  useEffect(() => {
    return subscribeCanvas(() => {
      const { w, h } = getResultDimensions();
      setHasResult(w > 0);
      setResultDims({ w, h });
    });
  }, []);

  useEffect(() => {
    let notified = false;
    return onWorkerCrash(() => {
      if (notified) return;
      notified = true;
      toast.warning(t('toast.workerCrashed'));
    });
  }, [t]);

  useEffect(() => {
    if (!sourceImage) setHasResult(false);
  }, [sourceImage]);

  // On first mount: if no source in store but IDB has one, offer restore.
  useEffect(() => {
    if (sourceImage) return;
    let cancelled = false;
    import('@/lib/sourceStorage').then((m) => m.loadSource()).then((saved) => {
      if (!cancelled && saved) setRestorePrompt({ blob: saved.blob, fileName: saved.fileName });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreAccept = useCallback(() => {
    if (!restorePrompt) return;
    const file = new File([restorePrompt.blob], restorePrompt.fileName, { type: restorePrompt.blob.type });
    setRestorePrompt(null);
    loadDroppedFile(file);
  }, [restorePrompt, loadDroppedFile]);

  const handleRestoreDiscard = useCallback(() => {
    setRestorePrompt(null);
    import('@/lib/sourceStorage').then((m) => m.clearSource());
  }, []);

  // Live-sync URL hash with current settings (debounced) so the address bar is
  // always copyable. Skipped while no source loaded (link is meaningless).
  const settingsForHash = useConverterStore((s) => s.settings);
  useEffect(() => {
    if (!sourceImage) return;
    const timer = setTimeout(() => {
      import('@/lib/shareLink').then((m) => m.writeHashToUrl(settingsForHash));
    }, 600);
    return () => clearTimeout(timer);
  }, [settingsForHash, sourceImage]);

  // --- Preview BG image: revoke object URL when replaced or unmounted ---
  useEffect(() => {
    return () => {
      if (previewBgImage) URL.revokeObjectURL(previewBgImage);
    };
  }, [previewBgImage]);

  const handleBgImagePick = useCallback(() => {
    bgFileInputRef.current?.click();
  }, []);

  const handleBgImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same file later
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error(t('toast.bgImageError'));
    };
    probe.src = url;
    if (previewBgImage) URL.revokeObjectURL(previewBgImage);
    setPreviewBgImage(url);
    setPreviewBg('image');
  }, [previewBgImage, t]);

  const handleBgImageClear = useCallback(() => {
    if (previewBgImage) URL.revokeObjectURL(previewBgImage);
    setPreviewBgImage(null);
    setPreviewBg('checkerboard');
  }, [previewBgImage]);

  // Paste image from clipboard (Ctrl+V)
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) return;
          e.preventDefault();
          if (sourceImage) setPendingReplaceFile(file);
          else loadDroppedFile(file);
          return;
        }
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [sourceImage, loadDroppedFile]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (sourceImage) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sourceImage]);

  // Keyboard shortcuts: Ctrl+C (copy), Ctrl+S (export), Ctrl+1..9 (presets), ? (help)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && hasResult) {
        e.preventDefault();
        handleCopy();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExport();
      }
      // Ctrl+1..Ctrl+9 → load factory preset N
      if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const preset = FACTORY_PRESETS[idx];
        if (!preset) return;
        e.preventDefault();
        const store = useConverterStore.getState();
        const ow = store.originalWidth;
        const oh = store.originalHeight;
        const maxDim = Math.max(preset.settings.width, preset.settings.height);
        const aspect = ow > 0 && oh > 0 ? ow / oh : 1;
        const w = aspect >= 1 ? maxDim : Math.max(1, Math.round(maxDim * aspect));
        const h = aspect >= 1 ? Math.max(1, Math.round(maxDim / aspect)) : maxDim;
        setPendingHistoryLabel(`Preset: ${preset.name}`);
        const next: ConverterSettings = { ...preset.settings, width: w, height: h, sizeMode: 'absolute' };
        store.loadSettings(next);
        toast.success(t('toast.presetLoaded', { name: preset.name }));
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCopy, handleExport, hasResult, t]);

  // --- Batch size toggle ---
  const toggleBatchSize = (size: number) => {
    setBatchSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size].sort((a, b) => a - b)
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-11 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            data-tour="sidebar-toggle"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="md:hidden w-6 h-6 rounded hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title={t('sidebar.toggle')}
            aria-label={t('sidebar.toggle')}
            aria-expanded={mobileSidebarOpen}
          >
            <svg aria-hidden="true" focusable="false" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">PS</span>
          </div>
          <h1 className="text-xs font-semibold tracking-tight text-foreground/90">PSX Converter</h1>

          <button
            onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors ml-1 uppercase font-mono"
            title={locale === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            aria-label={locale === 'en' ? 'Cambiar a Español' : 'Switch to English'}
          >
            {locale === 'en' ? 'ES' : 'EN'}
          </button>

          <button
            data-tour="shortcuts"
            onClick={() => setShowShortcuts(true)}
            className="text-[10px] w-5 h-5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            title={t('shortcuts.help')}
            aria-label={t('shortcuts.help')}
          >
            ?
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <div className="w-3 h-3 border-[1.5px] border-primary border-t-transparent rounded-full animate-spin" />
              {t('header.processing')}
            </motion.div>
          )}

          {sourceImage && (
            <Button size="sm" variant="ghost" className="text-[11px] h-7 px-2 gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => setShowRemoveDialog(true)} title={t('header.removeTitle')} aria-label={t('header.removeTitle')}>
              <svg aria-hidden="true" focusable="false" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {t('header.remove')}
            </Button>
          )}

          {hasResult && (
            <Button size="sm" variant="ghost" className="text-[11px] h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleCopy} title={t('header.copyTitle')} aria-label={t('header.copyTitle')}>
              <svg aria-hidden="true" focusable="false" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {t('header.copy')}
            </Button>
          )}

          {hasResult && (
            <Button size="sm" variant="ghost" className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowBatchExport(true)} title={t('export.batch')} aria-label={t('export.batch')}>
              <svg aria-hidden="true" focusable="false" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </Button>
          )}

          {hasResult && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">{t('export.scale')}:</span>
              {customScaleMode ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={32}
                    step={1}
                    value={customScaleInput}
                    onChange={(e) => setCustomScaleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitCustomScale();
                      else if (e.key === 'Escape') setCustomScaleMode(false);
                    }}
                    onBlur={commitCustomScale}
                    aria-label={t('export.scaleCustomLabel')}
                    className="h-7 w-14 px-2 text-[11px] rounded border border-border bg-background"
                    autoFocus
                  />
                  <span className="text-[11px] text-muted-foreground">×</span>
                  {resultDims.w > 0 && (() => {
                    const m = Math.max(1, Math.min(32, parseInt(customScaleInput, 10) || 1));
                    return (
                      <span className="text-[10px] text-muted-foreground/70 hidden md:inline">
                        → {resultDims.w * m}×{resultDims.h * m}
                      </span>
                    );
                  })()}
                </div>
              ) : (
                <Select
                  value={isPresetScale ? String(exportScale) : 'custom'}
                  onValueChange={(v) => {
                    if (!v) return;
                    if (v === 'custom') {
                      setCustomScaleInput(String(exportScale));
                      setCustomScaleMode(true);
                    } else {
                      setExportScale(parseInt(v, 10));
                    }
                  }}
                >
                  <SelectTrigger
                    className="h-7 text-[11px] px-2 gap-1"
                    title={t('export.scale')}
                    aria-label={t('export.scale')}
                  >
                    <SelectValue>
                      {isPresetScale && resultDims.w > 0 ? (
                        <span className="inline-flex items-baseline gap-1">
                          <span>{exportScale}×</span>
                          <span className="text-[10px] text-muted-foreground/85">
                            {resultDims.w * exportScale}×{resultDims.h * exportScale}
                          </span>
                        </span>
                      ) : (
                        `${exportScale}×`
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SCALE_PRESETS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {resultDims.w > 0 ? (
                          <span className="inline-flex items-baseline gap-1.5">
                            <span>{n}×</span>
                            <span className="text-[10px] text-muted-foreground/85">
                              {resultDims.w * n}×{resultDims.h * n}
                            </span>
                          </span>
                        ) : (
                          `${n}×`
                        )}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">{t('export.scaleCustom')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {hasResult && (() => {
            const palette = useConverterStore.getState().generatedPalette;
            const canIndexed = palette.length > 0 && palette.length <= 256;
            const tipKey = canIndexed ? 'export.indexedTip' : 'export.indexedDisabled';
            return (
              <label
                className={`flex items-center gap-1 text-[10px] select-none ${canIndexed ? 'text-muted-foreground cursor-pointer' : 'text-muted-foreground/40 cursor-not-allowed'}`}
                title={t(tipKey)}
              >
                <Checkbox
                  checked={exportIndexed && canIndexed}
                  disabled={!canIndexed}
                  onCheckedChange={(v) => setExportIndexed(!!v)}
                />
                PNG-8
              </label>
            );
          })()}

          <Button
            size="sm"
            data-tour="export"
            className="text-[11px] h-7 px-3 bg-primary hover:bg-primary/90"
            disabled={!hasResult || isProcessing || exportTooLarge}
            onClick={handleExport}
            title={exportTooLarge ? t('toast.exportTooLarge') : undefined}
          >
            {t('header.export')}
          </Button>
        </div>
      </header>


      {/* Dialogs */}
      <Dialog open={!!pendingReplaceFile} onOpenChange={(o) => { if (!o) { setPendingReplaceFile(null); setPaletteChoice('keep'); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{t('replace.title')}</DialogTitle></DialogHeader>
          <p className="text-[12px] text-muted-foreground">{t('replace.description')}</p>
          {pendingReplaceFile && (
            <p className="text-[11px] text-muted-foreground/70 truncate font-mono">{pendingReplaceFile.name}</p>
          )}
          {(() => {
            const s = useConverterStore.getState().settings;
            const hasCustomPalette = s.paletteSource !== 'generated' || s.palette.length > 0;
            if (!hasCustomPalette) return null;
            return (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground">{t('replace.paletteQuestion')}</p>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="radio"
                      name="palette-choice"
                      value="keep"
                      checked={paletteChoice === 'keep'}
                      onChange={() => setPaletteChoice('keep')}
                      className="accent-primary"
                    />
                    {t('replace.paletteKeep')}
                  </label>
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="radio"
                      name="palette-choice"
                      value="regen"
                      checked={paletteChoice === 'regen'}
                      onChange={() => setPaletteChoice('regen')}
                      className="accent-primary"
                    />
                    {t('replace.paletteRegen')}
                  </label>
                </div>
              </div>
            );
          })()}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => { setPendingReplaceFile(null); setPaletteChoice('keep'); }}>{t('replace.cancel')}</Button>
            <Button size="sm" className="text-[11px] bg-primary hover:bg-primary/90" onClick={handleConfirmReplace}>{t('replace.confirm')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{t('remove.title')}</DialogTitle></DialogHeader>
          <p className="text-[12px] text-muted-foreground">{t('remove.description')}</p>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setShowRemoveDialog(false)}>{t('remove.cancel')}</Button>
            <Button size="sm" variant="destructive" className="text-[11px]" onClick={handleRemoveImage}>{t('remove.confirm')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{t('shortcuts.title')}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-[12px]">
            {[
              ['Ctrl + Z', t('shortcuts.undo')],
              ['Ctrl + Y', t('shortcuts.redo')],
              ['Ctrl + C', t('shortcuts.copy')],
              ['Ctrl + V', t('shortcuts.paste')],
              ['Ctrl + S', t('shortcuts.export')],
              ['Ctrl + 1…9', t('shortcuts.preset')],
              ['?', t('shortcuts.help')],
            ].map(([key, action]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{action}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">{key}</kbd>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border">
            <Button
              size="sm" variant="outline" className="text-[11px] w-full"
              onClick={() => {
                setShowShortcuts(false);
                try { localStorage.removeItem('psx-tour-done'); } catch { /* ignore */ }
                window.dispatchEvent(new Event('psx:replay-tour'));
              }}
            >
              {t('tour.replay')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBatchExport} onOpenChange={setShowBatchExport}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{t('export.batchTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[16, 32, 64, 128, 256, 512].map(size => (
                <label key={size} className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <Checkbox checked={batchSizes.includes(size)} onCheckedChange={() => toggleBatchSize(size)} />
                  {size}x{size}
                </label>
              ))}
            </div>
            <Button size="sm" className="w-full text-[11px]" disabled={batchSizes.length === 0 || batchExporting}
              onClick={handleBatchExport}>
              {batchExporting ? '...' : `${t('export.download')} (${batchSizes.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isMobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />

        <main className="flex-1 flex flex-col overflow-hidden"
          onDragOver={(e) => { if (sourceImage) { e.preventDefault(); setIsDragOver(true); } }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={sourceImage ? handleDropOnPreview : undefined}
        >
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {!sourceImage ? (
                <motion.div key="dropzone" className="absolute inset-0" data-tour="dropzone"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <ImageDropzone />
                  {restorePrompt && (
                    <motion.div
                      initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                      className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-card/95 backdrop-blur-md px-3 py-2 rounded-full shadow-lg ring-1 ring-border"
                    >
                      <span className="text-[11px] text-foreground/80">{t('restore.title')}</span>
                      <span className="text-[10px] text-muted-foreground/70 font-mono truncate max-w-[140px]">{restorePrompt.fileName}</span>
                      <Button size="sm" className="text-[11px] h-6 px-2 bg-primary hover:bg-primary/90" onClick={handleRestoreAccept}>
                        {t('restore.continue')}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[11px] h-6 px-2 text-muted-foreground hover:text-destructive" onClick={handleRestoreDiscard}>
                        {t('restore.discard')}
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              ) : viewMode === 'slider' && hasResult ? (
                <motion.div key="slider" className="absolute inset-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <BeforeAfterSlider bg={previewBg} bgColor={previewBgCustom} bgImage={previewBgImage} />
                </motion.div>
              ) : (
                <motion.div key="sidebyside" className="absolute inset-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <PreviewCanvas bg={previewBg} bgColor={previewBgCustom} bgImage={previewBgImage} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drop overlay */}
            <AnimatePresence>
              {isDragOver && sourceImage && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                  <div className="border-2 border-dashed border-primary rounded-xl px-8 py-6 text-center">
                    <p className="text-sm text-primary font-medium">{t('dropzone.dropReplace')}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isProcessing && sourceImage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg ring-1 ring-border z-10">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[12px] text-foreground/80">{t('header.processing')}</span>
              </motion.div>
            )}
          </div>

          {sourceImage && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-between px-4 h-10 border-t border-border bg-card/50 shrink-0">
              <div className="flex items-center gap-1">
                {hasResult && (
                  <div className="flex bg-muted/50 rounded-md p-0.5 gap-0.5">
                    <button className={`text-[11px] px-3 py-1.5 rounded transition-colors ${viewMode === 'slider' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setViewMode('slider')}>{t('view.compare')}</button>
                    <button className={`text-[11px] px-3 py-1.5 rounded transition-colors ${viewMode === 'side-by-side' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setViewMode('side-by-side')}>{t('view.sideBySide')}</button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1" role="group" aria-label={t('preview.bgLabel')}>
                  <span className="text-[10px] text-muted-foreground/60 mr-1">{t('preview.bgLabel')}</span>
                  {(['checkerboard', 'black', 'white', 'custom'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setPreviewBg(b)}
                      title={t(`preview.bg.${b}` as const)}
                      aria-label={t(`preview.bg.${b}` as const)}
                      aria-pressed={previewBg === b}
                      className={`w-5 h-5 rounded border transition-colors ${
                        previewBg === b ? 'border-primary ring-1 ring-primary/50' : 'border-border/50 hover:border-border'
                      }`}
                      style={
                        b === 'checkerboard'
                          ? { backgroundImage: 'repeating-conic-gradient(#444 0% 25%, #888 0% 50%)', backgroundSize: '6px 6px' }
                          : b === 'black' ? { backgroundColor: '#000' }
                          : b === 'white' ? { backgroundColor: '#fff' }
                          : { backgroundColor: previewBgCustom }
                      }
                    />
                  ))}
                  {previewBg === 'custom' && (
                    <input
                      type="color"
                      value={previewBgCustom}
                      onChange={(e) => setPreviewBgCustom(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                      aria-label={t('preview.bg.custom')}
                    />
                  )}
                  <button
                    onClick={previewBgImage ? () => setPreviewBg('image') : handleBgImagePick}
                    title={t('preview.bg.image')}
                    aria-label={t('preview.bg.image')}
                    aria-pressed={previewBg === 'image'}
                    className={`w-5 h-5 rounded border transition-colors flex items-center justify-center text-muted-foreground ${
                      previewBg === 'image' ? 'border-primary ring-1 ring-primary/50' : 'border-border/50 hover:border-border'
                    }`}
                    style={previewBgImage && previewBg === 'image'
                      ? { backgroundImage: `url("${previewBgImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : undefined}
                  >
                    {!(previewBgImage && previewBg === 'image') && (
                      <svg aria-hidden="true" focusable="false" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="9" cy="9" r="1.5" />
                        <path d="M3 17l5-5 4 4 3-3 6 6" />
                      </svg>
                    )}
                  </button>
                  {previewBg === 'image' && previewBgImage && (
                    <>
                      <button
                        onClick={handleBgImagePick}
                        title={t('preview.bg.imageUpload')}
                        aria-label={t('preview.bg.imageUpload')}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
                      >
                        ↻
                      </button>
                      <button
                        onClick={handleBgImageClear}
                        title={t('preview.bg.imageClear')}
                        aria-label={t('preview.bg.imageClear')}
                        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1"
                      >
                        ✕
                      </button>
                    </>
                  )}
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBgImageChange}
                    className="sr-only"
                    aria-hidden="true"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground/50 font-mono">
                  {useConverterStore.getState().originalWidth} x {useConverterStore.getState().originalHeight}px
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
