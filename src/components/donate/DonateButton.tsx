import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, MotionConfig, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { setDonateTarget } from './donateState';

export const CAFECITO_URL = 'https://cafecito.app/amarusegovia';

interface DonateButtonProps {
  variant?: 'compact' | 'full' | 'icon' | 'footer';
  className?: string;
}

const sceneVariants = {
  rest: { filter: 'drop-shadow(0 0 0 rgba(167,139,250,0))' },
  hover: {
    filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.85))',
    transition: { duration: 0.25 },
  },
};

const waterVariants = {
  rest: { opacity: 0, pathLength: 0 },
  hover: {
    opacity: 1,
    pathLength: 1,
    transition: { delay: 0.45, duration: 0.4, ease: 'easeOut' as const },
  },
};

const steamVariants = {
  rest: { opacity: 0, y: 0, pathLength: 0 },
  hover: (i: number) => ({
    opacity: [0, 0.95, 0],
    y: [0, -3, -7],
    pathLength: [0, 1, 1],
    transition: {
      duration: 1.4,
      repeat: Infinity,
      delay: 0.7 + i * 0.18,
      ease: 'easeOut' as const,
    },
  }),
};

const sparkleVariants = {
  rest: { opacity: 0, scale: 0.4 },
  hover: (i: number) => ({
    opacity: [0, 1, 0],
    scale: [0.4, 1.1, 0.4],
    transition: {
      duration: 1.0,
      repeat: Infinity,
      delay: 1.0 + i * 0.13,
      ease: 'easeInOut' as const,
    },
  }),
};

const mateNudgeVariants = {
  rest: { rotate: 0, y: 0, scale: 1 },
  hover: {
    rotate: -8,
    y: -0.5,
    scale: 1.25,
    transition: {
      type: 'spring' as const,
      stiffness: 60,
      damping: 12,
      delay: 0.3,
    },
  },
};

const innerGlowVariants = {
  rest: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

export function MateAnimated({ className }: { className?: string }) {
  return (
    <MotionConfig reducedMotion="never">
    <motion.span
      aria-hidden="true"
      className={`relative inline-flex ${className ?? 'w-5 h-5'}`}
      style={{ overflow: 'visible' }}
    >
      <motion.svg
        variants={sceneVariants}
        viewBox="0 0 24 28"
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        preserveAspectRatio="xMidYMax meet"
        style={{ overflow: 'visible' }}
      >
        {/* Mate gourd — pear-shaped calabaza */}
        <motion.g variants={mateNudgeVariants} style={{ transformOrigin: '12px 19px' }}>
          {/* Body (pear/onion) */}
          <path d="M12 9 C14.6 9 17.6 10.8 18.9 13.8 C21.2 18 20.3 23.6 16.6 26 C14.8 27 13.2 27.2 12 27.2 C10.8 27.2 9.2 27 7.4 26 C3.7 23.6 2.8 18 5.1 13.8 C6.4 10.8 9.4 9 12 9 Z" />
          {/* Top rim (opening) */}
          <ellipse cx="12" cy="9" rx="4.7" ry="1.35" />
          {/* Bombilla — shaft + mouthpiece */}
          <line x1="14.6" y1="8.4" x2="22" y2="2.6" strokeWidth={2.1} />
          <circle cx="22.4" cy="2.3" r="1.4" fill="currentColor" stroke="none" />
        </motion.g>

      </motion.svg>
    </motion.span>
    </MotionConfig>
  );
}

function DonateTooltip({ visible, label, anchorRef }: { visible: boolean; label: string; anchorRef: React.RefObject<HTMLSpanElement | null> }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (visible && anchorRef.current) {
      setRect(anchorRef.current.getBoundingClientRect());
    }
  }, [visible, anchorRef]);

  if (!rect) return null;

  return createPortal(
    <MotionConfig reducedMotion="never">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed',
              left: rect.left + rect.width / 2,
              top: rect.top - 8,
              transform: 'translateX(-50%) translateY(-100%)',
              zIndex: 9998,
              pointerEvents: 'none',
            }}
            className="px-2.5 py-1 rounded-md text-xs whitespace-nowrap
              bg-background/90 backdrop-blur-sm border border-violet-500/35 text-violet-200/90 shadow-lg shadow-violet-950/40"
          >
            {label}
            <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-violet-500/35" />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>,
    document.body,
  );
}

export function DonateButton({ variant = 'compact', className }: DonateButtonProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const open = () => window.open(CAFECITO_URL, '_blank', 'noopener,noreferrer');

  const handleEnter = () => {
    setHovered(true);
    if (ref.current) {
      setDonateTarget(ref.current.getBoundingClientRect());
    }
  };
  const handleLeave = () => {
    setHovered(false);
    setDonateTarget(null);
  };

  useEffect(() => {
    const reset = () => handleLeave();
    window.addEventListener('blur', reset);
    return () => window.removeEventListener('blur', reset);
  }, []);

  if (variant === 'footer') {
    return (
      <motion.span
        ref={ref}
        initial="rest"
        whileHover="hover"
        animate="rest"
        whileTap={{ scale: 0.96 }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        onClick={open}
        role="button"
        tabIndex={0}
        className={`inline-flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer select-none relative transition-colors hover:bg-muted/50 ${className ?? ''}`}
      >
        <MotionConfig reducedMotion="never">
          <motion.span
            variants={innerGlowVariants}
            className="absolute inset-0 rounded-md pointer-events-none bg-gradient-to-br from-violet-500/15 via-violet-400/8 to-fuchsia-500/15"
          />
        </MotionConfig>
        <MateAnimated className="w-5 h-5" />
        <span className="text-sm text-foreground/80">{t('donate.compact')}</span>
      </motion.span>
    );
  }

  if (variant === 'icon') {
    return (
      <motion.span
        ref={ref}
        initial="rest"
        whileHover="hover"
        animate="rest"
        whileTap={{ scale: 0.94 }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        className="inline-flex relative"
      >
        <DonateTooltip visible={hovered} label={t('donate.tooltip')} anchorRef={ref} />
        <motion.span
          variants={innerGlowVariants}
          className="absolute inset-0 rounded-md pointer-events-none bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-fuchsia-500/20"
        />
        <Button
          size="sm"
          variant="outline"
          className={`h-7 w-7 p-0 hover:text-violet-300 hover:border-primary/60 hover:bg-primary/10 ${className ?? ''}`}
          onClick={open}
          aria-label={t('donate.tooltip')}
        >
          <MateAnimated className="w-5 h-5" />
        </Button>
      </motion.span>
    );
  }

  if (variant === 'full') {
    return (
      <motion.span
        ref={ref}
        initial="rest"
        whileHover="hover"
        animate="rest"
        whileTap={{ scale: 0.97 }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        className="block relative w-full"
      >
        <motion.span
          variants={innerGlowVariants}
          className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-br from-violet-500/15 via-violet-400/10 to-fuchsia-500/15"
        />
        <Button
          size="sm"
          variant="outline"
          className={`text-[11px] w-full gap-2 hover:text-violet-300 hover:border-primary/60 hover:bg-primary/10 ${className ?? ''}`}
          onClick={open}
        >
          <MateAnimated className="w-5 h-5" />
          {t('donate.full')}
        </Button>
      </motion.span>
    );
  }

  return (
    <motion.span
      ref={ref}
      initial="rest"
      whileHover="hover"
      animate="rest"
      whileTap={{ scale: 0.94 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className="inline-flex relative shrink-0"
    >
      <DonateTooltip visible={hovered} label={t('donate.tooltip')} anchorRef={ref} />
      <motion.span
        variants={innerGlowVariants}
        className="absolute inset-0 rounded-md pointer-events-none bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-fuchsia-500/20"
      />
      <Button
        size="sm"
        variant="outline"
        className={`text-xs h-7 px-2 gap-1.5 shrink-0 hover:text-violet-300 hover:border-primary/60 hover:bg-primary/10 ${className ?? ''}`}
        onClick={open}
        aria-label={t('donate.tooltip')}
      >
        <MateAnimated className="w-5 h-5" />
        <span className="hidden md:inline">{t('donate.compact')}</span>
      </Button>
    </motion.span>
  );
}
