import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export function InfoTip({ text }: { text: string }) {
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
      className="inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-muted-foreground/30 text-[9px] text-muted-foreground/60 cursor-help leading-none">
        ?
      </span>
      {show && createPortal(
        <span
          className="fixed w-56 px-3 py-2 rounded-md bg-popover text-popover-foreground text-[11px] leading-snug shadow-xl ring-1 ring-border z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
}
