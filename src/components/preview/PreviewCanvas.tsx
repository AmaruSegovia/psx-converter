import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [swapped, setSwappedRaw] = useState<boolean>(() => {
    try { return localStorage.getItem('psx-preview-swapped') === 'true'; }
    catch { return false; }
  });
  const setSwapped = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setSwappedRaw((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem('psx-preview-swapped', String(value)); } catch { /* private mode */ }
      return value;
    });
  }, []);
  const [inspectorEnabled, setInspectorEnabledRaw] = useState<boolean>(() => {
    try { return localStorage.getItem('psx-pixel-inspector') === 'true'; }
    catch { return false; }
  });
  const setInspectorEnabled = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setInspectorEnabledRaw((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem('psx-pixel-inspector', String(value)); } catch { /* private mode */ }
      return value;
    });
  }, []);
  type InspectorState = {
    visible: boolean;
    cursorX: number;
    cursorY: number;
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    a: number;
    hex: string;
    paletteIdx: number;
  };
  const [inspector, setInspector] = useState<InspectorState>({
    visible: false, cursorX: 0, cursorY: 0,
    x: 0, y: 0, r: 0, g: 0, b: 0, a: 0,
    hex: '#000000', paletteIdx: -1,
  });
  const inspectorRafRef = useRef<number | null>(null);
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

  // Pixel inspector: map cursor → source pixel, read RGB, find palette index.
  // Throttled to 1 sample per frame to keep getImageData cheap.
  const handleInspectorMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!inspectorEnabled) return;
    const container = containerRef.current;
    const src = getResultCanvas();
    if (!container || !src) return;
    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    if (inspectorRafRef.current !== null) return;
    inspectorRafRef.current = requestAnimationFrame(() => {
      inspectorRafRef.current = null;
      const cw = rect.width;
      const ch = rect.height;
      // Display canvas is centered: top-1/2 left-1/2 + translate(-50% + pan, ...).
      // Display visual size = src.width * zoom (single tile mode) or src.width * TILE_COUNT * zoom.
      const tile = showTileRef.current ? TILE_COUNT : 1;
      const dispW = src.width * tile * zoom;
      const dispH = src.height * tile * zoom;
      const left = cw / 2 + pan.x - dispW / 2;
      const top = ch / 2 + pan.y - dispH / 2;
      const dx = cursorX - left;
      const dy = cursorY - top;
      let sx = Math.floor(dx / zoom);
      let sy = Math.floor(dy / zoom);
      // Tile mode: cursor on any of 3×3 repeats → sample the corresponding source pixel
      if (tile > 1) {
        sx = ((sx % src.width) + src.width) % src.width;
        sy = ((sy % src.height) + src.height) % src.height;
      }
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) {
        setInspector((s) => s.visible ? { ...s, visible: false } : s);
        return;
      }
      try {
        const ctx = src.getContext('2d');
        if (!ctx) return;
        const px = ctx.getImageData(sx, sy, 1, 1).data;
        const r = px[0], g = px[1], b = px[2], a = px[3];
        const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        const palette = useConverterStore.getState().generatedPalette;
        const paletteIdx = palette.findIndex((p) => p.r === r && p.g === g && p.b === b);
        setInspector({ visible: true, cursorX, cursorY, x: sx, y: sy, r, g, b, a, hex, paletteIdx });
      } catch {
        // getImageData can throw on tainted canvases; bail silently.
      }
    });
  }, [inspectorEnabled, zoom, pan]);

  const handleInspectorLeave = useCallback(() => {
    if (inspectorRafRef.current !== null) {
      cancelAnimationFrame(inspectorRafRef.current);
      inspectorRafRef.current = null;
    }
    setInspector((s) => s.visible ? { ...s, visible: false } : s);
  }, []);

  // Reset overlay when toggle turns off.
  useEffect(() => {
    if (!inspectorEnabled) handleInspectorLeave();
  }, [inspectorEnabled, handleInspectorLeave]);

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
      <div className={`flex gap-6 items-center justify-center p-6 w-full h-full ${swapped ? 'flex-row-reverse' : ''}`}>
        {/* Source */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="flex flex-col items-center gap-2 flex-1 h-full justify-center overflow-hidden"
        >
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium shrink-0">
            {t('preview.original')}
          </span>
          <img
            src={sourceImage}
            alt={t('preview.original')}
            className="max-w-full max-h-[calc(100%-24px)] object-contain drop-shadow-2xl"
            style={{ imageRendering: 'pixelated' }}
          />
        </motion.div>

        <button
          type="button"
          onClick={() => setSwapped((s) => !s)}
          className="relative w-px h-2/3 bg-border/30 shrink-0 group flex items-center justify-center"
          title={t('preview.swapPanels')}
          aria-label={t('preview.swapPanels')}
        >
          <span className="absolute w-7 h-7 rounded-full bg-card border border-border/60 flex items-center justify-center opacity-60 group-hover:opacity-100 group-hover:border-primary/50 transition-all">
            <svg
              className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            >
              <path d="M7 4L4 7l3 3" />
              <path d="M4 7h16" />
              <path d="M17 20l3-3-3-3" />
              <path d="M20 17H4" />
            </svg>
          </span>
        </button>

        {/* Result */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="flex flex-col items-center gap-2 flex-1 h-full justify-center overflow-hidden"
        >
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
                {/* Pixel inspector toggle */}
                <button
                  onClick={() => setInspectorEnabled((v) => !v)}
                  className={`w-5 h-5 flex items-center justify-center rounded border transition-colors ${
                    inspectorEnabled
                      ? 'border-primary/70 text-primary bg-primary/10'
                      : 'border-border/40 text-muted-foreground/35 hover:text-muted-foreground/70 hover:border-border/70'
                  }`}
                  title={t('preview.inspectorTitle')}
                  aria-label={t('preview.inspectorTitle')}
                  aria-pressed={inspectorEnabled}
                >
                  <svg aria-hidden="true" focusable="false" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    <circle cx="12" cy="12" r="3" />
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
            className={`overflow-hidden flex-1 w-full relative ${inspectorEnabled ? 'cursor-crosshair' : canPan ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={(e) => { handlePointerMove(e); handleInspectorMove(e); }}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handleInspectorLeave}
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
            <AnimatePresence>
              {inspectorEnabled && inspector.visible && (() => {
                // Flip overlay to opposite quadrant near container edges so it
                // never spills outside the panel.
                const cw = containerRef.current?.clientWidth ?? 0;
                const ch = containerRef.current?.clientHeight ?? 0;
                const flipRight = inspector.cursorX > cw - 140;
                const flipBottom = inspector.cursorY > ch - 80;
                const style: React.CSSProperties = {
                  left: flipRight ? undefined : inspector.cursorX + 12,
                  right: flipRight ? cw - inspector.cursorX + 12 : undefined,
                  top: flipBottom ? undefined : inspector.cursorY + 12,
                  bottom: flipBottom ? ch - inspector.cursorY + 12 : undefined,
                };
                return (
                  <motion.div
                    key="inspector-overlay"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.12 }}
                    className="absolute pointer-events-none bg-card/95 border border-border rounded px-2 py-1 text-[10px] font-mono shadow-lg backdrop-blur-sm space-y-0.5"
                    style={style}
                  >
                    <div className="text-muted-foreground/70">{inspector.x},{inspector.y}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm border border-border" style={{ backgroundColor: inspector.hex }} />
                      <span>{inspector.hex}</span>
                    </div>
                    <div className="text-muted-foreground/70">rgb({inspector.r}, {inspector.g}, {inspector.b}){inspector.a < 255 ? ` · α${inspector.a}` : ''}</div>
                    {inspector.paletteIdx >= 0 && (
                      <div className="text-muted-foreground/50">#{inspector.paletteIdx}</div>
                    )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        </motion.div>
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
