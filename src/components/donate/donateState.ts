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

type PulseListener = () => void;
const pulseListeners = new Set<PulseListener>();

export function pulseDonate(): void {
  pulseListeners.forEach((fn) => fn());
}

export function subscribeDonatePulse(fn: PulseListener): () => void {
  pulseListeners.add(fn);
  return () => {
    pulseListeners.delete(fn);
  };
}
