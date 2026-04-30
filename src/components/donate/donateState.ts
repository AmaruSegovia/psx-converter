type Listener = (target: DOMRect | null) => void;

const listeners = new Set<Listener>();
let currentTarget: DOMRect | null = null;

export function setDonateTarget(target: DOMRect | null): void {
  currentTarget = target;
  listeners.forEach((fn) => fn(target));
}

export function subscribeDonateTarget(fn: Listener): () => void {
  listeners.add(fn);
  fn(currentTarget);
  return () => {
    listeners.delete(fn);
  };
}
