import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, MotionConfig } from 'framer-motion';
import { subscribeDonateTarget } from './donateState';
import { useTranslation } from '@/hooks/useTranslation';

// ── Pava landing spot ──────────────────────────────────────────────────────
// LAND_X_FACTOR: fracción del ancho del botón mate donde aterriza el pico.
//   0   = borde izquierdo del botón
//   0.5 = centro del botón
//   1   = borde derecho del botón
//   Ajustá hasta que el pico quede visualmente sobre la abertura del mate SVG.
const LAND_X_FACTOR = -0.1;

// LAND_Y_OFFSET: píxeles verticales desde el centro vertical del botón mate.
//   Negativo = arriba del centro (lo ideal: sobre la abertura del mate)
//   Positivo = abajo del centro
const LAND_Y_OFFSET = -16;

// ── Pava scale ──────────────────────────────────────────────────────────────
// SCALE_REST: tamaño de la pava en reposo (1 = 32px, el tamaño real del SVG).
//   Más grande que el valor anterior (0.45) porque ahora vive en el footer visible.
//   Subí para que se vea más, bajá para que sea más sutil.
const SCALE_REST   = 0.65;

// SCALE_ACTIVE: tamaño al derramar sobre el mate. 1 = tamaño natural del SVG.
//   Subí si se ve pequeña relativa al botón; bajá si se superpone demasiado.
const SCALE_ACTIVE = 1;
// ── Motion tuning ───────────────────────────────────────────────────────────
// Travel x/y
const MOVE_DURATION = 0.5;
const MOVE_EASE: [number, number, number, number] = [0.37, 0, 0.63, 1]; // easeInOutSine
// Arc peak: how many px the pava rises above its path mid-flight (negative = up)
const ARC_HEIGHT = -10;
// Scale
const SCALE_DURATION = 0.5;
const SCALE_DELAY    = 0.05;
const SCALE_EASE: [number, number, number, number] = [0.45, 0, 0.55, 1];
// Rotate — wobble keyframes on arrival: tilt → overshoot → settle
const ROTATE_DURATION = 0.85;
const ROTATE_EASE: [number, number, number, number] = [0.45, 0, 0.55, 1];
// Idle float
const FLOAT_DURATION = 2.5;   // seconds per up-down cycle
const FLOAT_AMPLITUDE = 2;    // px
// Idle wave — saludo periódico para llamar atención cuando está en reposo
const WAVE_PERIOD = 7;        // s entre cada wave (cuanto más alto, menos frecuente)
const WAVE_ANGLE  = -12;      // grados de la rotación (negativo = se inclina a la izquierda)
// Glow
const GLOW_DURATION = 0.5;
// ────────────────────────────────────────────────────────────────────────────

interface Delta { x: number; y: number; active: boolean; }
interface Rect  { left: number; top: number; width: number; height: number; }

export function DonatePava() {
  const { t } = useTranslation();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);
  const [delta, setDelta] = useState<Delta>({ x: 0, y: 0, active: false });

  useLayoutEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setAnchorRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!anchorRect) return;
    return subscribeDonateTarget((target) => {
      if (!target) {
        setDelta({ x: 0, y: 0, active: false });
        return;
      }
      const homeCX = anchorRect.left + anchorRect.width  / 2;
      const homeCY = anchorRect.top  + anchorRect.height / 2;
      setDelta({
        x: (target.left + target.width * LAND_X_FACTOR) - homeCX,
        y: (target.top  + target.height * 0.5 + LAND_Y_OFFSET) - homeCY,
        active: true,
      });
    });
  }, [anchorRect]);

  return (
    <>
      {/* Invisible placeholder — keeps space in the header layout */}
      <span
        ref={anchorRef}
        className="inline-block pointer-events-none"
        style={{ width: 32 * SCALE_REST, height: 32 * SCALE_REST }}
        aria-hidden="true"
      />

      {/* Actual pava — portaled to body to escape overflow:hidden */}
      {anchorRect && createPortal(
        <MotionConfig reducedMotion="never">
          {/* Outer: handles position + scale + glow */}
          <motion.div
            aria-hidden="true"
            className="text-foreground"
            style={{
              position: 'fixed',
              left: anchorRect.left + anchorRect.width  / 2 - 16,
              top:  anchorRect.top  + anchorRect.height / 2 - 16,
              width: 32,
              height: 32,
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
            initial={false}
            animate={{
              // Arc: x travels straight; y has a mid-peak keyframe for the lift
              x:      delta.active ? delta.x : 0,
              y:      delta.active ? [null, delta.y + ARC_HEIGHT, delta.y] : 0,
              // Wobble: overshoot then settle when arriving
              rotate: delta.active ? [null, 32, 24, 28] : 0,
              scale:  delta.active ? SCALE_ACTIVE : SCALE_REST,
              filter: delta.active
                ? 'drop-shadow(0 0 8px rgba(167,139,250,0.9))'
                : 'drop-shadow(0 0 0 rgba(167,139,250,0))',
            }}
            transition={{
              type: 'tween',
              duration: MOVE_DURATION,
              ease: MOVE_EASE,
              x:      { type: 'tween', duration: MOVE_DURATION, ease: MOVE_EASE },
              y:      { type: 'tween', duration: MOVE_DURATION, ease: MOVE_EASE,
                        times: [0, 0.45, 1] },
              rotate: { type: 'tween', duration: ROTATE_DURATION, ease: ROTATE_EASE,
                        times: [0, 0.55, 0.78, 1] },
              scale:  { type: 'tween', duration: SCALE_DURATION,  ease: SCALE_EASE, delay: SCALE_DELAY },
              filter: { type: 'tween', duration: GLOW_DURATION,   ease: 'easeOut' },
            }}
            title={t('donate.tooltip')}
          >
            <PavaSVG />
          </motion.div>
        </MotionConfig>,
        document.body,
      )}
    </>
  );
}

function PavaSVG() {
  return (
    <svg
      viewBox="0 0 32 30"
      className="w-8 h-8"
      fill="none"
      stroke="#ffffff"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* Handle — D-arch above lid, slight thickness for grip */}
      <path d="M7 7 Q7 -2 15 -2 Q23 -2 23 7" strokeWidth={3} />

      {/* Lid — rim ellipse + knob */}
      <ellipse cx="15" cy="7.6" rx="6" ry="1.7" />
      <circle cx="15" cy="5.4" r="1.4" fill="currentColor" stroke="none" />

      {/* Body — rounded squat kettle, slight shoulder taper */}
      <path d="M5 11 Q4 14 4.6 18.4 Q5.4 24.6 9.4 26.6 Q15 28.4 20.6 26.6 Q24.6 24.6 25.4 18.4 Q26 14 25 11 Q20 9.4 15 9.4 Q10 9.4 5 11 Z" fill="#0c0c0f" fillOpacity={0.65} />

      {/* Spout — straight, angled up-right */}
      <path d="M24.6 13.4 Q26.4 12 28.2 11 L30.4 10.2 L30.8 12 L28.6 12.6 Q26.8 13.6 25.4 14.8" strokeWidth={2.6} />
    </svg>
  );
}
