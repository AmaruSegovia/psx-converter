/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { useConverterStore } from '@/store/converterStore';
import type { TranslationKey } from '@/lib/i18n';

const TOUR_KEY = 'psx-tour-done';
export const REPLAY_EVENT = 'psx:replay-tour';

type Side = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface TourStep {
  /** First selector that yields an on-screen rect wins; falls back to next. */
  selectors: string[];
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  /** Preferred side. The component still rebates to whichever side fits. */
  prefer?: Side;
}

const STEPS: TourStep[] = [
  { selectors: [], titleKey: 'tour.welcomeTitle', bodyKey: 'tour.welcomeBody', prefer: 'center' },
  { selectors: ['[data-tour="dropzone"]'], titleKey: 'tour.loadTitle', bodyKey: 'tour.loadBody', prefer: 'center' },
  { selectors: ['[data-tour="sidebar"]', '[data-tour="sidebar-toggle"]'], titleKey: 'tour.settingsTitle', bodyKey: 'tour.settingsBody', prefer: 'right' },
  { selectors: ['[data-tour="export"]'], titleKey: 'tour.exportTitle', bodyKey: 'tour.exportBody', prefer: 'bottom' },
  { selectors: ['[data-tour="shortcuts"]'], titleKey: 'tour.shortcutsTitle', bodyKey: 'tour.shortcutsBody', prefer: 'bottom' },
];

const POPOVER_MARGIN = 14;
const VIEWPORT_PAD = 12;

interface Placement {
  top: number;
  left: number;
  /** Whether this slot fits cleanly. False forces caller to fall back. */
  fits: boolean;
}

function findVisibleAnchor(selectors: string[]): { el: Element; rect: DOMRect } | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const onScreen =
      rect.width > 0 && rect.height > 0 &&
      rect.right > 0 && rect.left < window.innerWidth &&
      rect.bottom > 0 && rect.top < window.innerHeight;
    if (onScreen) return { el, rect };
  }
  return null;
}

function clampRect(rect: DOMRect): DOMRect {
  // Clamp anchor box to a sensible max so the highlight ring doesn't span the
  // whole viewport when the anchor itself is the entire main area.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxW = vw * 0.7;
  const maxH = vh * 0.6;
  if (rect.width <= maxW && rect.height <= maxH) return rect;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const w = Math.min(rect.width, maxW);
  const h = Math.min(rect.height, maxH);
  return new DOMRect(cx - w / 2, cy - h / 2, w, h);
}

function tryPlacement(
  side: Exclude<Side, 'center'>,
  anchor: DOMRect,
  pop: { w: number; h: number },
): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  if (side === 'bottom') {
    top = anchor.bottom + POPOVER_MARGIN;
    left = anchor.left + anchor.width / 2 - pop.w / 2;
  } else if (side === 'top') {
    top = anchor.top - POPOVER_MARGIN - pop.h;
    left = anchor.left + anchor.width / 2 - pop.w / 2;
  } else if (side === 'right') {
    top = anchor.top + anchor.height / 2 - pop.h / 2;
    left = anchor.right + POPOVER_MARGIN;
  } else {
    top = anchor.top + anchor.height / 2 - pop.h / 2;
    left = anchor.left - POPOVER_MARGIN - pop.w;
  }

  // A placement "fits" if it doesn't overflow on its primary axis.
  // The secondary axis can clamp (e.g. a button pinned to the top-right corner
  // can have a bottom-placed popover that shifts left to stay in viewport).
  const primaryFits =
    (side === 'top' || side === 'bottom')
      ? top >= VIEWPORT_PAD && top + pop.h <= vh - VIEWPORT_PAD
      : left >= VIEWPORT_PAD && left + pop.w <= vw - VIEWPORT_PAD;
  const fits = primaryFits;

  // Always clamp to viewport so callers can use the result even when fits=false.
  return {
    top: Math.max(VIEWPORT_PAD, Math.min(vh - pop.h - VIEWPORT_PAD, top)),
    left: Math.max(VIEWPORT_PAD, Math.min(vw - pop.w - VIEWPORT_PAD, left)),
    fits,
  };
}

function pickPlacement(prefer: Side, anchor: DOMRect, pop: { w: number; h: number }): Placement {
  if (prefer === 'center') return centerPlacement(pop);
  const opposites: Record<Exclude<Side, 'center'>, Exclude<Side, 'center'>> = {
    bottom: 'top', top: 'bottom', left: 'right', right: 'left',
  };
  const order: Exclude<Side, 'center'>[] = [
    prefer as Exclude<Side, 'center'>,
    opposites[prefer as Exclude<Side, 'center'>],
    'bottom', 'top', 'right', 'left',
  ];
  for (const side of order) {
    const p = tryPlacement(side, anchor, pop);
    if (p.fits) return p;
  }
  // No side fit — fall back to centered overlay.
  return centerPlacement(pop);
}

function centerPlacement(pop: { w: number; h: number }): Placement {
  return {
    top: Math.max(VIEWPORT_PAD, (window.innerHeight - pop.h) / 2),
    left: Math.max(VIEWPORT_PAD, (window.innerWidth - pop.w) / 2),
    fits: true,
  };
}

export function Onboarding() {
  const { t } = useTranslation();
  const hasImage = useConverterStore((s) => !!s.sourceImage);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<Placement>(() => centerPlacement({ w: 280, h: 200 }));
  const popoverRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  useEffect(() => {
    let cancelled = false;
    const done = (() => { try { return localStorage.getItem(TOUR_KEY) === 'true'; } catch { return false; } })();
    if (!done) {
      const t = setTimeout(() => { if (!cancelled) setOpen(true); }, 400);
      return () => { cancelled = true; clearTimeout(t); };
    }
  }, []);

  useEffect(() => {
    const handler = () => { setStep(0); setOpen(true); };
    window.addEventListener(REPLAY_EVENT, handler);
    return () => window.removeEventListener(REPLAY_EVENT, handler);
  }, []);

  // Resolve anchor (with fallback chain) when step or open changes.
  useEffect(() => {
    if (!open) return;
    const current = STEPS[step];
    const update = () => {
      if (current.selectors.length === 0) {
        setAnchorRect(null);
        return;
      }
      const found = findVisibleAnchor(current.selectors);
      if (!found) {
        setAnchorRect(null);
        return;
      }
      // Scroll into view if needed (no-op when already visible).
      try { found.el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch { /* old browsers */ }
      setAnchorRect(clampRect(found.rect));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, step]);

  // After paint, measure popover and compute final placement.
  // setState-in-effect is intentional here: layout measurements drive
  // re-positioning, no other escape hatch (file-level disable above).
  useLayoutEffect(() => {
    if (!open) return;
    if (isMobile) return; // mobile uses bottom-sheet, no positioning needed
    const node = popoverRef.current;
    const size = node ? { w: node.offsetWidth, h: node.offsetHeight } : { w: 280, h: 200 };
    if (!anchorRect || STEPS[step].prefer === 'center') {
      setPlacement(centerPlacement(size));
    } else {
      setPlacement(pickPlacement(STEPS[step].prefer ?? 'bottom', anchorRect, size));
    }
  }, [open, step, anchorRect, isMobile]);

  const close = useCallback((markDone: boolean) => {
    if (markDone) { try { localStorage.setItem(TOUR_KEY, 'true'); } catch { /* private mode */ } }
    setOpen(false);
    setStep(0);
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      if (s < STEPS.length - 1) return s + 1;
      close(true);
      return s;
    });
  }, [close]);

  const prev = useCallback(() => {
    setStep((s) => (s > 0 ? s - 1 : s));
  }, []);

  // Keyboard navigation: →/Enter advance, ←/Backspace back, Escape skip.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, next, prev, close]);

  if (!open) return null;
  const current = STEPS[step];

  // Step 2 body adapts when an image is already loaded.
  const bodyKey: TranslationKey =
    step === 1 && hasImage ? 'tour.loadBodyLoaded' : current.bodyKey;

  // Mobile: pinned bottom-sheet, full width minus padding. Highlight is purely
  // decorative — overlapping anchors are still "visible" through the lighter
  // backdrop.
  const popoverStyle: React.CSSProperties = isMobile
    ? { left: 12, right: 12, bottom: 12, width: 'auto', maxWidth: 'calc(100vw - 24px)' }
    : { top: placement.top, left: placement.left, width: 280 };

  // Highlight ring — only when we have a valid on-screen anchor.
  const showHighlight = anchorRect !== null;

  return createPortal(
    <AnimatePresence>
      {/* No backdrop-blur: the highlighted element must stay crisp and readable. */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/60"
        onClick={() => close(false)}
      />
      {showHighlight && (
        <motion.div
          key={`highlight-${step}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed z-[9998] rounded-lg ring-2 ring-primary pointer-events-none"
          style={{
            top: anchorRect.top - 4,
            left: anchorRect.left - 4,
            width: anchorRect.width + 8,
            height: anchorRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          }}
        />
      )}
      <motion.div
        ref={popoverRef}
        key={`step-${step}`}
        initial={{ opacity: 0, y: isMobile ? 16 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: isMobile ? 16 : 6 }}
        transition={{ duration: 0.18 }}
        className="fixed z-[9999] bg-card border border-border rounded-lg shadow-2xl p-4"
        style={popoverStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tour-title"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1 items-center">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? 'w-4 h-1.5 bg-primary'
                    : 'w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => close(true)}
            className="text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors"
          >
            {t('tour.dontShow')}
          </button>
        </div>
        <h3 id="tour-title" className="text-sm font-semibold mb-1">{t(current.titleKey)}</h3>
        <p className="text-[12px] text-muted-foreground mb-3 leading-snug">{t(bodyKey)}</p>
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => close(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('tour.skip')}
            </button>
            {step > 0 && (
              <button
                onClick={prev}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('tour.back')}
              </button>
            )}
          </div>
          <button
            onClick={next}
            className="text-[11px] px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            autoFocus
          >
            {step < STEPS.length - 1 ? t('tour.next') : t('tour.done')}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
