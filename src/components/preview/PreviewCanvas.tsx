import { useState, useRef, useEffect, useCallback } from 'react';
import { useConverterStore } from '@/store/converterStore';
import { subscribeCanvas, getResultCanvas, getResultDimensions } from '@/lib/canvasBus';
import { useTranslation } from '@/hooks/useTranslation';

const GRID_ZOOM_THRESHOLD = 1.5;
const TILE_COUNT = 3; // 3×3 repeat

export type PreviewBg = 'checkerboard' | 'black' | 'white' | 'custom' | 'image';

interface PreviewCanvasProps {
  bg?: PreviewBg;
  bgColor?: string;
  bgImage?: string | null;
}

export function PreviewCanvas({ bg = 'checkerboard', bgColor = '#1a1525', bgImage = null }: PreviewCanvasProps = {}) {
  const { t } = useTranslation();
  const sourceImage = useConverterStore((s) => s.sourceImage);
  const isProcessing = useConverterStore((s) => s.isProcessing);

  const containerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitZoom, setFitZoom] = useState(1);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [showTile, setShowTile] = useState(false);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const prevDims = useRef({ w: 0, h: 0 });
  // Pointer tracking for pinch-zoom on touch devices
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef(0);
  // Refs so callbacks can read latest values without re-subscribing
  const showTileRef = useRef(false);
  showTileRef.current = showTile;

  const getContainerSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { cw: 0, ch: 0 };
    return { cw: el.clientWidth, ch: el.clientHeight };
  }, []);

  // Derived display dimensions (scaled up in tile mode)
  const displayW = dims.w * (showTile ? TILE_COUNT : 1);
  const displayH = dims.h * (showTile ? TILE_COUNT : 1);

  // Paint result canvas (tiled or single) onto display canvas
  const paintCanvas = useCallback(() => {
    const display = displayRef.current;
    const src = getResultCanvas();
    if (!display || !src || !src.width || !src.height) return;

    const tc = showTileRef.current ? TILE_COUNT : 1;
    const tw = src.width * tc;
    const th = src.height * tc;

    if (display.width !== tw || display.height !== th) {
      display.width = tw;
      display.height = th;
    }
    const ctx = display.getContext('2d')!;
    if (tc === 1) {
      ctx.drawImage(src, 0, 0);
    } else {
      for (let row = 0; row < tc; row++) {
        for (let col = 0; col < tc; col++) {
          ctx.drawImage(src, col * src.width, row * src.height);
        }
      }
    }
  }, []); // uses showTileRef so no deps needed

  // Paint pixel grid overlay
  const paintGrid = useCallback(() => {
    const gridCanvas = gridRef.current;
    const container = containerRef.current;
    if (!gridCanvas || !container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (gridCanvas.width !== cw) gridCanvas.width = cw;
    if (gridCanvas.height !== ch) gridCanvas.height = ch;

    const ctx = gridCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);

    if (!showGrid || zoom <= GRID_ZOOM_THRESHOLD || displayW <= 0 || displayH <= 0) return;

    const originX = cw / 2 + pan.x - (displayW * zoom) / 2;
    const originY = ch / 2 + pan.y - (displayH * zoom) / 2;
    const imgW = displayW * zoom;
    const imgH = displayH * zoom;

    // Clip strictly to image bounds — no lines outside the canvas
    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, imgW, imgH);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x <= displayW; x++) {
      const px = Math.round(originX + x * zoom) + 0.5;
      ctx.moveTo(px, originY);
      ctx.lineTo(px, originY + imgH);
    }
    for (let y = 0; y <= displayH; y++) {
      const py = Math.round(originY + y * zoom) + 0.5;
      ctx.moveTo(originX, py);
      ctx.lineTo(originX + imgW, py);
    }
    ctx.stroke();

    ctx.restore();
  }, [showGrid, zoom, pan, displayW, displayH]);

  useEffect(() => { paintGrid(); }, [paintGrid]);

  // ResizeObserver to repaint grid when container resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(paintGrid);
    observer.observe(el);
    return () => observer.disconnect();
  }, [paintGrid]);

  // Refit + repaint when tile mode toggles
  useEffect(() => {
    paintCanvas();
    if (dims.w > 0 && dims.h > 0) {
      const { cw, ch } = getContainerSize();
      const dw = dims.w * (showTile ? TILE_COUNT : 1);
      const dh = dims.h * (showTile ? TILE_COUNT : 1);
      if (cw && dw && dh) {
        const pad = 16;
        const fit = Math.max(1, Math.min((cw - pad) / dw, (ch - pad) / dh));
        setFitZoom(fit);
        setZoom(fit);
        setPan({ x: 0, y: 0 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTile]);

  // Subscribe to canvasBus
  useEffect(() => {
    return subscribeCanvas(() => {
      const { w, h } = getResultDimensions();
      const tc = showTileRef.current ? TILE_COUNT : 1;
      const dw = w * tc;
      const dh = h * tc;

      if (w !== prevDims.current.w || h !== prevDims.current.h) {
        const isFirstResult = prevDims.current.w === 0 && prevDims.current.h === 0;
        prevDims.current = { w, h };
        setDims({ w, h });

        const { cw, ch } = getContainerSize();
        if (cw && dw && dh) {
          const pad = 16;
          const fit = Math.max(1, Math.min((cw - pad) / dw, (ch - pad) / dh));
          setFitZoom(fit);

          if (isFirstResult || Math.abs(zoom - fitZoom) < 0.01) {
            setZoom(fit);
            setPan({ x: 0, y: 0 });
          }
        }
      }

      paintCanvas();
      paintGrid();
    });
  }, [paintCanvas, paintGrid, getContainerSize, zoom, fitZoom]);

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
        setPan(p => clampPan(p.x * ratio, p.y * ratio, next, displayW, displayH, el.clientWidth, el.clientHeight));
        return next;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [displayW, displayH]);

  // Drag pan + pinch zoom
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (activePointers.current.size === 1) {
      dragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    } else if (activePointers.current.size === 2) {
      dragging.current = false;
      const [a, b] = Array.from(activePointers.current.values());
      lastPinchDist.current = Math.hypot(b.x - a.x, b.y - a.y);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      const [a, b] = Array.from(activePointers.current.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (lastPinchDist.current > 0) {
        const factor = dist / lastPinchDist.current;
        setZoom(prev => {
          const next = Math.max(1, Math.min(40, prev * factor));
          const ratio = next / prev;
          setPan(p => {
            const { cw, ch } = getContainerSize();
            return clampPan(p.x * ratio, p.y * ratio, next, displayW, displayH, cw, ch);
          });
          return next;
        });
      }
      lastPinchDist.current = dist;
      return;
    }

    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => {
      const { cw, ch } = getContainerSize();
      return clampPan(p.x + dx, p.y + dy, zoom, displayW, displayH, cw, ch);
    });
  }, [zoom, displayW, displayH, getContainerSize]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) lastPinchDist.current = 0;
    if (activePointers.current.size === 0) dragging.current = false;
    else if (activePointers.current.size === 1) {
      const remaining = Array.from(activePointers.current.values())[0];
      lastMouse.current = { x: remaining.x, y: remaining.y };
      dragging.current = true;
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }, [fitZoom]);

  if (!sourceImage) return null;

  const resultLabel = dims.w && dims.h ? `${t('preview.result')} (${dims.w}×${dims.h})` : t('preview.result');
  const canPan = zoom * displayW > (containerRef.current?.clientWidth ?? Infinity) ||
                 zoom * displayH > (containerRef.current?.clientHeight ?? Infinity);

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
    <div className={`absolute inset-0 flex items-center justify-center ${bgClass}`} style={bgStyle}>
      <div className="flex gap-6 items-center justify-center p-6 w-full h-full">
        {/* Source */}
        <div className="flex flex-col items-center gap-2 flex-1 h-full justify-center overflow-hidden">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium shrink-0">
            {t('preview.original')}
          </span>
          <img
            src={sourceImage}
            alt={t('preview.original')}
            className="max-w-full max-h-[calc(100%-24px)] object-contain drop-shadow-2xl"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        <div className="w-px h-2/3 bg-border/30 shrink-0" />

        {/* Result */}
        <div className="flex flex-col items-center gap-2 flex-1 h-full justify-center overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
              {isProcessing ? t('preview.processing') : resultLabel}
            </span>
            {dims.w > 0 && (
              <span className="text-[9px] text-muted-foreground/40 font-mono">
                {Math.round(zoom * 100)}%
              </span>
            )}
            {dims.w > 0 && (
              <div className="flex items-center gap-1 ml-1">
                {/* Pixel grid toggle */}
                <button
                  onClick={() => setShowGrid(g => !g)}
                  className={`w-5 h-5 flex items-center justify-center rounded border transition-colors ${
                    showGrid
                      ? 'border-primary/70 text-primary bg-primary/10'
                      : 'border-border/40 text-muted-foreground/35 hover:text-muted-foreground/70 hover:border-border/70'
                  }`}
                  title={showGrid ? t('preview.hideGrid') : t('preview.showGrid')}
                  aria-label={showGrid ? t('preview.hideGrid') : t('preview.showGrid')}
                  aria-pressed={showGrid}
                >
                  <svg aria-hidden="true" focusable="false" className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <rect x="0.65" y="0.65" width="4.7" height="4.7" />
                    <rect x="6.65" y="0.65" width="4.7" height="4.7" />
                    <rect x="0.65" y="6.65" width="4.7" height="4.7" />
                    <rect x="6.65" y="6.65" width="4.7" height="4.7" />
                  </svg>
                </button>
                {/* Tile mode toggle */}
                <button
                  onClick={() => setShowTile(prev => !prev)}
                  className={`w-5 h-5 flex items-center justify-center rounded border transition-colors ${
                    showTile
                      ? 'border-primary/70 text-primary bg-primary/10'
                      : 'border-border/40 text-muted-foreground/35 hover:text-muted-foreground/70 hover:border-border/70'
                  }`}
                  title={showTile ? t('preview.hideTile') : t('preview.showTile')}
                  aria-label={showTile ? t('preview.hideTile') : t('preview.showTile')}
                  aria-pressed={showTile}
                >
                  <svg aria-hidden="true" focusable="false" className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <rect x="0.65" y="0.65" width="2.7" height="2.7" />
                    <rect x="4.65" y="0.65" width="2.7" height="2.7" />
                    <rect x="8.65" y="0.65" width="2.7" height="2.7" />
                    <rect x="0.65" y="4.65" width="2.7" height="2.7" />
                    <rect x="4.65" y="4.65" width="2.7" height="2.7" />
                    <rect x="8.65" y="4.65" width="2.7" height="2.7" />
                    <rect x="0.65" y="8.65" width="2.7" height="2.7" />
                    <rect x="4.65" y="8.65" width="2.7" height="2.7" />
                    <rect x="8.65" y="8.65" width="2.7" height="2.7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div
            ref={containerRef}
            className={`overflow-hidden flex-1 w-full relative ${canPan ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
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
            <canvas
              ref={gridRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
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
