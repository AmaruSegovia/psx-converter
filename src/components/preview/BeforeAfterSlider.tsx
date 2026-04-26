import { useState, useRef, useCallback, useEffect } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { subscribeCanvas, getResultCanvas, getResultDimensions } from '@/lib/canvasBus';
import { useTranslation } from '@/hooks/useTranslation';

interface BeforeAfterSliderProps {
  bg?: 'checkerboard' | 'black' | 'white' | 'custom' | 'image';
  bgColor?: string;
  bgImage?: string | null;
}

export function BeforeAfterSlider({ bg = 'checkerboard', bgColor = '#1a1525', bgImage = null }: BeforeAfterSliderProps = {}) {
  const { t } = useTranslation();
  const sourceImage = useConverterStore((s) => s.sourceImage);
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const sourceLoadedRef = useRef(false);

  // Compute ONE display size for both images — based on result aspect ratio.
  // Source is intentionally squashed to match: the slider compares "exact same
  // area edited vs not edited" pixel-for-pixel under the divider, which only
  // works when both images cover the same rectangle.
  const computeDisplaySize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { w: rw, h: rh } = getResultDimensions();
    if (!rw || !rh) return;

    const pad = 48;
    const cw = container.clientWidth - pad;
    const ch = container.clientHeight - pad;

    // Fit result dimensions into container
    const scale = Math.min(cw / rw, ch / rh);
    setDisplaySize({
      w: Math.round(rw * scale),
      h: Math.round(rh * scale),
    });
  }, []);

  // Draw result at its actual pixel dimensions
  const drawCanvas = useCallback(() => {
    const src = getResultCanvas();
    const canvas = canvasRef.current;
    if (!src || !canvas) return;

    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
  }, []);

  // Subscribe to canvasBus
  useEffect(() => {
    return subscribeCanvas(() => {
      const { w } = getResultDimensions();
      setHasResult(w > 0);
      if (sourceLoadedRef.current) {
        computeDisplaySize();
        drawCanvas();
      }
    });
  }, [drawCanvas, computeDisplaySize]);

  const handleSourceLoad = useCallback(() => {
    sourceLoadedRef.current = true;
    computeDisplaySize();
    drawCanvas();
  }, [computeDisplaySize, drawCanvas]);

  useEffect(() => {
    computeDisplaySize();
    window.addEventListener('resize', computeDisplaySize);
    return () => window.removeEventListener('resize', computeDisplaySize);
  }, [computeDisplaySize, sourceImage]);

  useEffect(() => {
    sourceLoadedRef.current = false;
  }, [sourceImage]);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setPosition(x * 100);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!sourceImage || !hasResult) return null;

  // Both images get the SAME display size — source deforms to match result aspect ratio
  const sharedStyle: React.CSSProperties = displaySize
    ? { width: displaySize.w, height: displaySize.h, imageRendering: 'pixelated' }
    : { imageRendering: 'pixelated' };

  const { w: rw, h: rh } = getResultDimensions();
  const resultLabel = rw && rh ? `${t('preview.converted')} (${rw}x${rh})` : t('preview.converted');

  const useImage = bg === 'image' && !!bgImage;
  const bgClass = !useImage && bg === 'checkerboard' ? 'canvas-checkerboard' : '';
  const bgStyle: React.CSSProperties = useImage
    ? {
        backgroundImage: `url("${bgImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000',
      }
    : bg === 'black' ? { backgroundColor: '#000' }
    : bg === 'white' ? { backgroundColor: '#fff' }
    : bg === 'custom' ? { backgroundColor: bgColor }
    : {};

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 cursor-col-resize select-none ${bgClass}`}
      style={bgStyle}
      role="slider"
      aria-label={t('view.compare')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); setPosition((p) => Math.max(0, p - (e.shiftKey ? 10 : 2))); }
        if (e.key === 'ArrowRight') { e.preventDefault(); setPosition((p) => Math.min(100, p + (e.shiftKey ? 10 : 2))); }
        if (e.key === 'Home')  { e.preventDefault(); setPosition(0); }
        if (e.key === 'End')   { e.preventDefault(); setPosition(100); }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Before (source) — deformed to match result aspect ratio */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <img
          ref={sourceRef}
          src={sourceImage}
          alt={t('preview.original')}
          style={sharedStyle}
          onLoad={handleSourceLoad}
          draggable={false}
        />
      </div>

      {/* After (result) — same display size */}
      <div
        className="absolute inset-0 flex items-center justify-center p-6"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <canvas
          ref={canvasRef}
          style={sharedStyle}
        />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-px pointer-events-none"
        style={{ left: `${position}%`, background: 'linear-gradient(to bottom, transparent, oklch(0.65 0.2 295), transparent)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-primary bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/30">
          <svg className="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />
          </svg>
        </div>
      </div>

      <span className="absolute top-3 left-3 text-[9px] uppercase tracking-widest font-medium bg-black/50 text-white/70 px-2 py-0.5 rounded-md backdrop-blur-sm">
        {t('preview.original')}
      </span>
      <span className="absolute top-3 right-3 text-[9px] uppercase tracking-widest font-medium bg-black/50 text-white/70 px-2 py-0.5 rounded-md backdrop-blur-sm">
        {resultLabel}
      </span>
    </div>
  );
}
