type StatusType = 'success' | 'warning';
type Listener = (msg: string, type: StatusType) => void;
type ClearListener = () => void;

const listeners = new Set<Listener>();
const clearListeners = new Set<ClearListener>();

export function setHeaderStatus(msg: string, type: StatusType = 'success'): void {
  listeners.forEach((fn) => fn(msg, type));
}

export function subscribeHeaderStatus(
  onSet: Listener,
  onClear: ClearListener,
): () => void {
  listeners.add(onSet);
  clearListeners.add(onClear);
  return () => {
    listeners.delete(onSet);
    clearListeners.delete(onClear);
  };
}
