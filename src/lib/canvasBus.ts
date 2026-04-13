// Module-level singleton: direct canvas publish/subscribe.
// Bypasses Zustand, React re-renders, and base64 encoding entirely.

let _canvas: HTMLCanvasElement | null = null;
let _listeners: Array<() => void> = [];
let _width = 0;
let _height = 0;

export function getResultCanvas(): HTMLCanvasElement | null {
  return _canvas;
}

export function getResultDimensions(): { w: number; h: number } {
  return { w: _width, h: _height };
}

export function publishCanvas(canvas: HTMLCanvasElement) {
  _canvas = canvas;
  _width = canvas.width;
  _height = canvas.height;
  for (const fn of _listeners) fn();
}

export function subscribeCanvas(fn: () => void): () => void {
  _listeners.push(fn);
  // Immediately notify if there's already a canvas — so newly mounted components paint right away
  if (_canvas) fn();
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}
