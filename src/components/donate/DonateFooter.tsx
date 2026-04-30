import { useRef, useState, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { setDonateTarget } from './donateState';
import { DonatePava } from './DonatePava';
import { MateAnimated, CAFECITO_URL } from './DonateButton';

// ── Effect tuning ──────────────────────────────────────────────────────────
const SPOTLIGHT_RADIUS = 160;     // px del spotlight violeta que sigue el cursor
const SPOTLIGHT_OPACITY = 0.18;    // intensidad
const MAGNETIC_RADIUS = 90;        // px alrededor del mate donde el cursor lo atrae
const MAGNETIC_PULL = 0.18;        // fuerza del imán (0-1)
const RIPPLE_SIZE = 360;           // diámetro final del ripple en click
const RIPPLE_DURATION = 0.7;       // s
const COIN_TRAVEL = 56;            // px hacia arriba que vuela el corazón al click
const COIN_DURATION = 1.1;         // s
const WORD_STAGGER = 0.05;         // s entre palabra y palabra
const BORDER_FLOW_DURATION = 2.5;  // s del gradiente animado top
// ────────────────────────────────────────────────────────────────────────────

interface Ripple { id: number; x: number; y: number; }
interface Coin   { id: number; x: number; }

export function DonateFooter() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mateRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);

  // Spotlight: posición del cursor relativa al contenedor (suavizada)
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);
  const spotX = useSpring(mouseX, { stiffness: 200, damping: 30 });
  const spotY = useSpring(mouseY, { stiffness: 200, damping: 30 });
  const spotlightBg = useTransform(
    [spotX, spotY] as never,
    ([x, y]: number[]) =>
      `radial-gradient(${SPOTLIGHT_RADIUS}px circle at ${x}px ${y}px, rgba(167,139,250,${SPOTLIGHT_OPACITY}), transparent 70%)`
  );

  // Mate magnético: desplazamiento sutil hacia el cursor
  const mateOffX = useMotionValue(0);
  const mateOffY = useMotionValue(0);
  const mateOffXSpring = useSpring(mateOffX, { stiffness: 180, damping: 18 });
  const mateOffYSpring = useSpring(mateOffY, { stiffness: 180, damping: 18 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !mateRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);

    const mateRect = mateRef.current.getBoundingClientRect();
    const mcx = mateRect.left + mateRect.width / 2;
    const mcy = mateRect.top + mateRect.height / 2;
    const dx = e.clientX - mcx;
    const dy = e.clientY - mcy;
    const dist = Math.hypot(dx, dy);
    if (dist < MAGNETIC_RADIUS) {
      const pull = (1 - dist / MAGNETIC_RADIUS) * MAGNETIC_PULL;
      mateOffX.set(dx * pull);
      mateOffY.set(dy * pull);
    } else {
      mateOffX.set(0);
      mateOffY.set(0);
    }
  };

  const handleEnter = () => {
    setHovered(true);
    if (mateRef.current) setDonateTarget(mateRef.current.getBoundingClientRect());
  };
  const handleLeave = () => {
    setHovered(false);
    setDonateTarget(null);
    mateOffX.set(0);
    mateOffY.set(0);
    mouseX.set(-1000);
    mouseY.set(-1000);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rid = Date.now() + Math.random();
    setRipples((rs) => [...rs, { id: rid, x, y }]);
    window.setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== rid)), RIPPLE_DURATION * 1000);

    if (mateRef.current) {
      const mateRect = mateRef.current.getBoundingClientRect();
      const cx = mateRect.left + mateRect.width / 2 - rect.left;
      const cid = Date.now() + Math.random() + 1;
      setCoins((cs) => [...cs, { id: cid, x: cx }]);
      window.setTimeout(() => setCoins((cs) => cs.filter((c) => c.id !== cid)), COIN_DURATION * 1000);
    }

    window.open(CAFECITO_URL, '_blank', 'noopener,noreferrer');
  };

  // Reset si la ventana pierde foco
  useEffect(() => {
    const reset = () => {
      setHovered(false);
      setDonateTarget(null);
      mateOffX.set(0);
      mateOffY.set(0);
    };
    window.addEventListener('blur', reset);
    return () => window.removeEventListener('blur', reset);
  }, [mateOffX, mateOffY]);

  const description = t('donate.description');
  const words = description.split(' ');

  return (
    <MotionConfig reducedMotion="never">
      <motion.div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="relative flex items-center px-3 py-2 shrink-0 cursor-pointer select-none overflow-hidden border-t border-border"
      >
        {/* Spotlight gradient — sigue el cursor */}
        <motion.div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{ background: spotlightBg, opacity: hovered ? 1 : 0 }}
        />

        {/* Border-top gradiente animado en hover */}
        <motion.div
          className="absolute top-0 inset-x-0 h-px pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.9) 35%, rgba(232,121,249,0.9) 65%, transparent 100%)',
            backgroundSize: '50% 100%',
            backgroundRepeat: 'no-repeat',
          }}
          animate={
            hovered
              ? { opacity: 0 }
              : { backgroundPositionX: ['-50%', '150%'], opacity: 1 }
          }
          transition={
            hovered
              ? { duration: 0.25 }
              : { backgroundPositionX: { duration: BORDER_FLOW_DURATION, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.25 } }
          }
        />

        {/* Pava anchor (la pava portaleada vive acá) */}
        <DonatePava />

        {/* Mate magnético */}
        <motion.span
          ref={mateRef}
          style={{ x: mateOffXSpring, y: mateOffYSpring }}
          className="relative z-10 inline-flex items-center gap-2 ml-1"
        >
          <MateAnimated className="w-5 h-5" />
          <span className="text-sm text-foreground/85">{t('donate.compact')}</span>
        </motion.span>

        {/* Descripción con stagger por palabras */}
        <div className="ml-auto z-10 flex flex-wrap justify-end gap-x-1 text-[11px] text-muted-foreground/70 leading-snug max-w-[55%] text-right">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: 8 }}
              animate={hovered ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
              transition={{ duration: 0.25, delay: hovered ? i * WORD_STAGGER : 0, ease: 'easeOut' }}
            >
              {w}
            </motion.span>
          ))}
        </div>

        {/* Click ripples */}
        <AnimatePresence>
          {ripples.map((r) => (
            <motion.span
              key={r.id}
              initial={{ scale: 0, opacity: 0.55 }}
              animate={{ scale: 1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: RIPPLE_DURATION, ease: 'easeOut' }}
              className="absolute pointer-events-none rounded-full border border-violet-400/60"
              style={{
                left: r.x - RIPPLE_SIZE / 2,
                top: r.y - RIPPLE_SIZE / 2,
                width: RIPPLE_SIZE,
                height: RIPPLE_SIZE,
              }}
            />
          ))}
        </AnimatePresence>

        {/* Corazones que vuelan al click (confirmación) */}
        <AnimatePresence>
          {coins.map((c) => (
            <motion.span
              key={c.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: -COIN_TRAVEL, scale: [0.5, 1.25, 1, 0.9] }}
              exit={{ opacity: 0 }}
              transition={{ duration: COIN_DURATION, ease: 'easeOut' }}
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-base z-20"
              style={{ left: c.x - 8 }}
            >
              💜
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
}
