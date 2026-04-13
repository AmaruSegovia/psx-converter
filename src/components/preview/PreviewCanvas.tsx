import { useState, useRef, useEffect, useCallback } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { subscribeCanvas, getResultCanvas, getResultDimensions } from '@/lib/canvasBus';
import { useTranslation } from '@/hooks/useTranslation';

export function PreviewCanvas() {
  const { t } = useTranslation();
  const sourceImage = useConverterStore((s) => s.sourceImage);
  const isProcessing = useConverterStore((s) => s.isProcessing);

  const containerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitZoom, setFitZoom] = useState(1);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const prevDims = useRef({ w: 0, h: 0 });

  const getContainerSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { cw: 0, ch: 0 };
    return { cw: el.clientWidth, ch: el.clientHeight };
  }, []);

  // Paint result canvas directly onto display canvas
  const paintCanvas = useCallback(() => {
    const display = displayRef.current;
    const src = getResultCanvas();
    if (!display || !src || !src.width || !src.height) return;

    if (display.width !== src.width || display.height !== src.height) {
      display.width = src.width;
      display.height = src.height;
    }
    const ctx = display.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
  }, []);

  // Subscribe to canvasBus
  useEffect(() => {
    return subscribeCanvas(() => {
      const { w, h } = getResultDimensions();

      if (w !== prevDims.current.w || h !== prevDims.current.h) {
        const isFirstResult = prevDims.current.w === 0 && prevDims.current.h === 0;
        prevDims.current = { w, h };
        setDims({ w, h });

        const { cw, ch } = getContainerSize();
        if (cw && w && h) {
          const pad = 16;
          const fit = Math.max(1, Math.min((cw - pad) / w, (ch - pad) / h));
          setFitZoom(fit);

          // Only auto-fit on first result or large dimension changes (user changed resize)
          if (isFirstResult || Math.abs(zoom - fitZoom) < 0.01) {
            setZoom(fit);
            setPan({ x: 0, y: 0 });
          }
        }
      }

      paintCanvas();
    });
  }, [paintCanvas, getContainerSize, zoom, fitZoom]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.85 : 1.18;
      setZoom(prev => {
        const next = Math.max(1, Math.min(40, prev * factor));
        const ratio = next / prev;
        setPan(p => clampPan(p.x * ratio, p.y * ratio, next, dims.w, dims.h, el.clientWidth, el.clientHeight));
        return next;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [dims]);

  // Drag pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => {
      const { cw, ch } = getContainerSize();
      return clampPan(p.x + dx, p.y + dy, zoom, dims.w, dims.h, cw, ch);
    });
  }, [zoom, dims, getContainerSize]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }, [fitZoom]);

  if (!sourceImage) return null;

  const resultLabel = dims.w && dims.h ? `${t('preview.result')} (${dims.w} x ${dims.h}px)` : t('preview.result');
  const canPan = zoom * dims.w > (containerRef.current?.clientWidth ?? Infinity) ||
                 zoom * dims.h > (containerRef.current?.clientHeight ?? Infinity);

  return (
    <div className="absolute inset-0 flex items-center justify-center canvas-checkerboard">
      <div className="flex gap-6 items-center justify-center p-6 w-full h-full">
        {/* Source */}
        <div className="flex flex-col items-center gap-2 flex-1 h-full justify-center overflow-hidden">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium shrink-0">{t('preview.original')}</span>
          <img
            src={sourceImage}
            alt="Original"
            className="max-w-full max-h-[calc(100%-24px)] object-contain drop-shadow-2xl"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        <div className="w-px h-2/3 bg-border/30 shrink-0" />

        {/* Result — direct canvas */}
        <div className="flex flex-col items-center gap-2 flex-1 h-full justify-center overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
              {isProcessing ? t('preview.processing') : resultLabel}
            </span>
            {dims.w > 0 && (
              <span className="text-[9px] text-muted-foreground/40 font-mono">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </div>
          <div
            ref={containerRef}
            className={`overflow-hidden flex-1 w-full relative ${canPan ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={handleDoubleClick}
          >
            <canvas
              ref={displayRef}
              className="drop-shadow-2xl absolute top-1/2 left-1/2 select-none"
              style={{
                imageRendering: 'pixelated',
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                transformOrigin: 'center',
                willChange: 'transform',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function clampPan(
  px: number, py: number,
  zoom: number, imgW: number, imgH: number,
  containerW: number, containerH: number,
) {
  const sw = imgW * zoom;
  const sh = imgH * zoom;
  const maxPanX = Math.max(0, (sw - containerW) / 2);
  const maxPanY = Math.max(0, (sh - containerH) / 2);
  return {
    x: Math.max(-maxPanX, Math.min(maxPanX, px)),
    y: Math.max(-maxPanY, Math.min(maxPanY, py)),
  };
}
