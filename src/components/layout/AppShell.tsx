import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useConverterStore } from '@/store/converterStore';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useTranslation } from '@/hooks/useTranslation';
import { exportPNG, loadImage, processFullPipeline } from '@/lib/imageProcessing';
import { getResultCanvas, subscribeCanvas, getResultDimensions } from '@/lib/canvasBus';
import { onWorkerCrash } from '@/lib/quantizationClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Sidebar } from './Sidebar';
import { ImageDropzone } from '@/components/preview/ImageDropzone';
import { PreviewCanvas } from '@/components/preview/PreviewCanvas';
import { BeforeAfterSlider } from '@/components/preview/BeforeAfterSlider';

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
  const [batchSizes, setBatchSizes] = useState([32, 64, 128, 256]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
    setShowRemoveDialog(false);
    setHasResult(false);
    toast.success(t('toast.imageRemoved'));
  };

  const handleExport = useCallback(() => {
    const canvas = getResultCanvas();
    if (!canvas) { toast.error(t('toast.noResult')); return; }
    exportPNG(canvas, getExportFilename());
    toast.success(t('toast.exported'));
  }, [t, getExportFilename]);

  const handleCopy = useCallback(async () => {
    const canvas = getResultCanvas();
    if (!canvas) { toast.error(t('toast.noResult')); return; }
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.success(t('toast.copied'));
    } catch {
      toast.error(t('toast.copyFailed'));
    }
  }, [t]);

  const handleBatchExport = useCallback(async () => {
    const source = useConverterStore.getState().sourceImage;
    const settings = useConverterStore.getState().settings;
    if (!source) return;

    setBatchExporting(true);
    const failedSizes: number[] = [];
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const size of batchSizes) {
        try {
          const batchSettings = { ...settings, width: size, height: size, sizeMode: 'absolute' as const };
          const { resultCanvas } = await processFullPipeline(source, batchSettings);
          const blob = await new Promise<Blob>((res, rej) =>
            resultCanvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png')
          );
          zip.file(getExportFilename(size, size), blob);
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
  }, [batchSizes, getExportFilename, t]);

  const loadDroppedFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target?.result as string;
        const store = useConverterStore.getState();
        store.setSourceImage(base64, file.name);
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
    if (pendingReplaceFile) loadDroppedFile(pendingReplaceFile);
    setPendingReplaceFile(null);
  }, [pendingReplaceFile, loadDroppedFile]);

  // --- Effects ---
  useEffect(() => {
    return subscribeCanvas(() => {
      const { w } = getResultDimensions();
      setHasResult(w > 0);
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

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (sourceImage) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sourceImage]);

  // Keyboard shortcuts: Ctrl+C (copy), Ctrl+S (export), ? (shortcuts)
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
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCopy, handleExport, hasResult]);

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

          <Button size="sm" className="text-[11px] h-7 px-3 bg-primary hover:bg-primary/90"
            disabled={!hasResult || isProcessing} onClick={handleExport}>
            {t('header.export')}
          </Button>
        </div>
      </header>

      {/* Dialogs */}
      <Dialog open={!!pendingReplaceFile} onOpenChange={(o) => { if (!o) setPendingReplaceFile(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{t('replace.title')}</DialogTitle></DialogHeader>
          <p className="text-[12px] text-muted-foreground">{t('replace.description')}</p>
          {pendingReplaceFile && (
            <p className="text-[11px] text-muted-foreground/70 truncate font-mono">{pendingReplaceFile.name}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setPendingReplaceFile(null)}>{t('replace.cancel')}</Button>
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
              ['Ctrl + S', t('shortcuts.export')],
              ['?', t('shortcuts.help')],
            ].map(([key, action]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{action}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">{key}</kbd>
              </div>
            ))}
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
                <motion.div key="dropzone" className="absolute inset-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <ImageDropzone />
                </motion.div>
              ) : viewMode === 'slider' && hasResult ? (
                <motion.div key="slider" className="absolute inset-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <BeforeAfterSlider />
                </motion.div>
              ) : (
                <motion.div key="sidebyside" className="absolute inset-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <PreviewCanvas />
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
              <div className="text-[11px] text-muted-foreground/50 font-mono">
                {useConverterStore.getState().originalWidth} x {useConverterStore.getState().originalHeight}px
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
