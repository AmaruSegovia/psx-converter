import { useState, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Lightweight hover/focus tooltip rendered via portal to escape clipping
 * containers (ScrollArea, dialogs). Use for icon-only buttons or compact
 * controls where `title=` would be too slow / inaccessible.
 */
export function HoverTooltip({ label, children, className }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShow(true);
  };

  return (
    <span
      ref={ref}
      className={className ?? 'inline-flex'}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      onFocus={handleEnter}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <span
          role="tooltip"
          className="fixed max-w-xs px-2 py-1 rounded-md bg-popover text-popover-foreground text-[10px] leading-tight shadow-xl ring-1 ring-border z-[9999] pointer-events-none whitespace-nowrap"
          style={{ left: pos.x, top: pos.y - 6, transform: 'translate(-50%, -100%)' }}
        >
          {label}
        </span>,
        document.body
      )}
    </span>
  );
}
