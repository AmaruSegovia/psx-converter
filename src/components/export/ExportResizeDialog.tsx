import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { EXPORT_PIXEL_LIMIT } from '@/lib/imageProcessing';

const MIN_SCALE = 1;
const MAX_SCALE = 16;
const PANEL_W = 280;
const SNAP_LABELS = [1, 2, 4, 8, 16];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current export scale (float, 1–16). */
  scale: number;
  onScaleChange: (scale: number) => void;
  /** Output dimensions of the edited image (resultDims). */
  baseWidth: number;
  baseHeight: number;
  /** Button element to anchor the panel below. */
  anchorEl?: Element | null;
}

export function ExportResizeDialog({
  open,
  onOpenChange,
  scale,
  onScaleChange,
  baseWidth,
  baseHeight,
  anchorEl,
}: Props) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  const initW = () => Math.max(1, Math.round(baseWidth * scale));
  const initH = () => Math.max(1, Math.round(baseHeight * scale));

  const [localW, setLocalW] = useState(initW);
  const [localH, setLocalH] = useState(initH);

  useEffect(() => {
    if (open) {
      setLocalW(initW());
      setLocalH(initH());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scale, baseWidth, baseHeight]);

  const sliderVal = baseWidth > 0
    ? Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(localW / baseWidth)))
    : MIN_SCALE;

  const tooLarge = localW > 0 && localH > 0 && localW * localH > EXPORT_PIXEL_LIMIT;

  const handleSlider = useCallback((v: number | readonly number[]) => {
    const n = Array.isArray(v) ? v[0] : (v as number);
    if (!Number.isFinite(n)) return;
    setLocalW(Math.max(1, Math.round(baseWidth * n)));
    setLocalH(Math.max(1, Math.round(baseHeight * n)));
  }, [baseWidth, baseHeight]);

  const handleWidthChange = useCallback((raw: string) => {
    const v = parseInt(raw, 10);
    if (!Number.isFinite(v) || v <= 0) return;
    setLocalW(v);
    if (baseHeight > 0 && baseWidth > 0) {
      setLocalH(Math.max(1, Math.round(v * (baseHeight / baseWidth))));
    }
  }, [baseWidth, baseHeight]);

  const handleHeightChange = useCallback((raw: string) => {
    const v = parseInt(raw, 10);
    if (!Number.isFinite(v) || v <= 0) return;
    setLocalH(v);
    if (baseWidth > 0 && baseHeight > 0) {
      setLocalW(Math.max(1, Math.round(v * (baseWidth / baseHeight))));
    }
  }, [baseWidth, baseHeight]);

  const handleApply = useCallback(() => {
    if (baseWidth > 0) onScaleChange(localW / baseWidth);
    onOpenChange(false);
  }, [baseWidth, localW, onScaleChange, onOpenChange]);

  // Close on outside click (deferred to avoid catching the opener click).
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (anchorEl && anchorEl.contains(e.target as Node)) return;
        onOpenChange(false);
      }
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [open, anchorEl, onOpenChange]);

  // Keyboard: Enter to apply, Escape to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onOpenChange(false); }
      else if (e.key === 'Enter') { e.preventDefault(); handleApply(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleApply, onOpenChange]);

  if (!open) return null;

  // Position panel below anchor, or center if no anchor (mobile/kebab flow).
  let style: React.CSSProperties;
  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + PANEL_W > vw - 8) left = vw - PANEL_W - 8;
    if (left < 8) left = 8;
    // Flip above if not enough room below (estimate 260px panel height).
    if (top + 260 > vh - 8) top = Math.max(8, rect.top - 260 - 6);
    style = { position: 'fixed', top, left, width: PANEL_W };
  } else {
    const vw = window.innerWidth;
    style = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: Math.min(PANEL_W, vw - 24),
    };
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t('resize.title')}
      className="z-[9999] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[13px] font-semibold">{t('resize.title')}</span>
        <button
          onClick={() => onOpenChange(false)}
          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors -mr-1"
          aria-label={t('resize.cancel')}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" focusable="false">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 flex flex-col gap-4">
        {/* Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{t('resize.scale')}</span>
            <span className="text-[15px] font-semibold tabular-nums leading-none">{sliderVal}×</span>
          </div>
          <Slider
            value={[sliderVal]}
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={1}
            onValueChange={handleSlider}
            aria-label={t('resize.scale')}
          />
          <div className="flex justify-between px-0.5 mt-0.5">
            {SNAP_LABELS.map((n) => (
              <button
                key={n}
                onClick={() => handleSlider(n)}
                className={`text-[10px] px-0.5 rounded transition-colors ${
                  sliderVal === n
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {n}×
              </button>
            ))}
          </div>
        </div>

        {/* W/H inputs */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[11px] text-muted-foreground">{t('resize.width')}</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                value={localW || ''}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="h-8 text-sm text-center"
                aria-label={t('resize.width')}
              />
              <span className="text-[11px] text-muted-foreground shrink-0">px</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[11px] text-muted-foreground">{t('resize.height')}</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                value={localH || ''}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="h-8 text-sm text-center"
                aria-label={t('resize.height')}
              />
              <span className="text-[11px] text-muted-foreground shrink-0">px</span>
            </div>
          </div>
        </div>

        {/* Output summary */}
        {localW > 0 && (
          <p className="text-[11px] text-muted-foreground -mt-1">
            {t('resize.output')}: {localW} × {localH} px
          </p>
        )}
        {tooLarge && (
          <p className="text-[11px] text-destructive -mt-2">{t('resize.tooLarge')}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-4 pb-4 pt-3 border-t border-border bg-muted/30">
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1 h-9">
          {t('resize.cancel')}
        </Button>
        <Button size="sm" onClick={handleApply} disabled={tooLarge || localW <= 0} className="flex-1 h-9">
          {t('resize.apply')}
        </Button>
      </div>
    </div>,
    document.body
  );
}
