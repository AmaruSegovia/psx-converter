import type { ConverterSettings, PaletteColor } from '@/types';

type QuantResult = { imageData: ImageData; generatedPalette: PaletteColor[] };

interface Pending {
  resolve: (v: QuantResult) => void;
  reject: (e: Error) => void;
  priority: 'full' | 'fast';
}

let _worker: Worker | null = null;
let _workerBroken = false;
let _msgId = 0;
const _pending = new Map<number, Pending>();
const _crashListeners = new Set<() => void>();

export function onWorkerCrash(fn: () => void): () => void {
  _crashListeners.add(fn);
  // If already broken, fire immediately on next tick so caller can register listener first.
  if (_workerBroken) queueMicrotask(fn);
  return () => _crashListeners.delete(fn);
}

// Latest-wins: fast-quant requests get superseded when a newer one is sent.
// Full requests are not superseded (they come from debounce, already rate-limited).
let _latestFastId = 0;

// Last generated palette cache — shared across calls so tier 2 can reuse
// the palette from the most recent successful full pass, avoiding a costly
// Wu/RGBQuant sample on every drag frame.
let _lastPalette: { sourceKey: string; palette: PaletteColor[] } | null = null;

export function setLastPalette(sourceKey: string, palette: PaletteColor[]): void {
  _lastPalette = { sourceKey, palette };
}

export function clearLastPalette(): void {
  _lastPalette = null;
}

export function getLastPalette(sourceKey: string): PaletteColor[] | null {
  return _lastPalette && _lastPalette.sourceKey === sourceKey ? _lastPalette.palette : null;
}

function getWorker(): Worker | null {
  if (_workerBroken) return null;
  if (_worker) return _worker;
  try {
    _worker = new Worker(new URL('./quantization.worker.ts', import.meta.url), { type: 'module' });
    _worker.onmessage = (e: MessageEvent) => {
      const { id, error, buffer, width, height, generatedPalette } = e.data;
      const handler = _pending.get(id);
      if (!handler) return;
      _pending.delete(id);
      // Latest-wins: stale fast-quant responses are discarded.
      if (handler.priority === 'fast' && id < _latestFastId) {
        handler.reject(new Error('stale'));
        return;
      }
      if (error) {
        handler.reject(new Error(error));
        return;
      }
      const data = new Uint8ClampedArray(buffer);
      handler.resolve({
        imageData: new ImageData(data, width, height),
        generatedPalette,
      });
    };
    _worker.onerror = () => {
      _workerBroken = true;
      _worker = null;
      for (const p of _pending.values()) p.reject(new Error('Worker crashed'));
      _pending.clear();
      for (const fn of _crashListeners) {
        try { fn(); } catch (err) { console.error('crash listener failed:', err); }
      }
    };
    return _worker;
  } catch {
    _workerBroken = true;
    for (const fn of _crashListeners) {
      try { fn(); } catch (err) { console.error('crash listener failed:', err); }
    }
    return null;
  }
}

export interface QuantizeOpts {
  frozenPalette?: PaletteColor[];
  priority?: 'full' | 'fast';
}

export async function quantize(
  imageData: ImageData,
  settings: ConverterSettings,
  opts: QuantizeOpts = {}
): Promise<QuantResult> {
  const priority = opts.priority ?? 'full';

  // PSX 555 bypass: hardware emulation is pure per-pixel snap, no clustering
  // and no dither. Skip the worker entirely — main-thread is fast enough.
  if (settings.paletteSource === 'psx555') {
    const { quantizePSX555 } = await import('./quantization');
    return quantizePSX555(imageData);
  }

  const worker = getWorker();
  if (!worker) {
    const { default: quantizeImage } = await import('./quantization');
    return quantizeImage(imageData, settings, { frozenPalette: opts.frozenPalette });
  }

  return new Promise((resolve, reject) => {
    const id = ++_msgId;
    if (priority === 'fast') _latestFastId = id;
    _pending.set(id, { resolve, reject, priority });
    const buf = imageData.data.buffer;
    worker.postMessage(
      {
        id,
        buffer: buf,
        width: imageData.width,
        height: imageData.height,
        settings,
        frozenPalette: opts.frozenPalette,
      },
      { transfer: [buf] }
    );
  });
}
