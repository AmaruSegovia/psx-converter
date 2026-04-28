import { useCallback, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

interface EditableValueProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  onChange: (v: number) => void;
  /** How to render the value in display mode. */
  format?: (v: number) => string;
  /** Suffix added when no `format` is provided. */
  suffix?: string;
  /** Tooltip override. */
  title?: string;
  className?: string;
}

/**
 * Numeric value display that becomes an inline input on single click.
 * Double-click resets to `defaultValue` (when provided).
 *
 * `step` controls the precision: integer when `step >= 1`, otherwise float
 * with up to `step`'s implied decimals.
 */
export function EditableValue({
  value,
  min,
  max,
  step = 1,
  defaultValue,
  onChange,
  format,
  suffix = '',
  title,
  className,
}: EditableValueProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const lastClickRef = useRef(0);
  const controls = useAnimationControls();

  const isInteger = step >= 1;

  /** Quick scale bounce to signal a successful commit/reset. */
  const flash = useCallback(() => {
    controls.start({
      scale: [1, 1.2, 1],
      transition: { duration: 0.25, ease: 'easeOut' },
    });
  }, [controls]);

  const startEdit = useCallback(() => {
    setDraft(String(value));
    setEditing(true);
  }, [value]);

  const commit = useCallback(() => {
    setEditing(false);
    const parsed = isInteger ? parseInt(draft, 10) : parseFloat(draft);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
    if (clamped !== value) flash();
  }, [draft, isInteger, min, max, onChange, value, flash]);

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-16 h-5 text-[11px] text-right bg-muted border border-primary/50 rounded px-1 outline-none text-primary font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none tabular-nums"
        min={min}
        max={max}
        step={step}
      />
    );
  }

  const display = format ? format(value) : `${value}${suffix}`;
  const tooltip = title ?? (defaultValue !== undefined
    ? 'Click to edit · Double-click to reset'
    : 'Click to edit');

  // When no defaultValue is provided, double-click reset is impossible —
  // skip the 250ms disambiguation delay and edit immediately.
  const supportsReset = defaultValue !== undefined;

  return (
    <motion.button
      type="button"
      animate={controls}
      style={{ transformOrigin: 'right center', display: 'inline-block' }}
      onClick={() => {
        if (!supportsReset) {
          startEdit();
          return;
        }
        // Distinguish single click (edit) from double click (reset). Real
        // dblclick fires after the second click; we delay edit-mode entry
        // until we know no second click is coming.
        const now = Date.now();
        if (now - lastClickRef.current < 250) {
          lastClickRef.current = 0;
          if (defaultValue !== value) {
            onChange(defaultValue!);
            flash();
          }
          return;
        }
        lastClickRef.current = now;
        setTimeout(() => {
          if (lastClickRef.current && Date.now() - lastClickRef.current >= 240) {
            lastClickRef.current = 0;
            startEdit();
          }
        }, 250);
      }}
      title={tooltip}
      className={className ?? 'text-[11px] text-muted-foreground font-mono hover:text-primary transition-colors cursor-text tabular-nums'}
    >
      {display}
    </motion.button>
  );
}
