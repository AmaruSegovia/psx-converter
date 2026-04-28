import { motion, AnimatePresence } from 'framer-motion';

interface ChangedDotProps {
  show: boolean;
  /** Optional className override (e.g. for absolute positioning on tabs). */
  className?: string;
}

/**
 * Small primary-colored dot that pops in/out with a scale spring when its
 * `show` prop toggles. Used as a "this control differs from default" marker.
 *
 * Default styling is inline (next to a label). Pass `className` to override
 * for absolute-positioned use cases (tab badges).
 */
export function ChangedDot({
  show,
  className = 'w-1.5 h-1.5 rounded-full bg-primary',
}: ChangedDotProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          key="dot"
          aria-hidden="true"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className={className}
        />
      )}
    </AnimatePresence>
  );
}
