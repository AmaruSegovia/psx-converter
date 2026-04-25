import { describe, it, expect } from 'vitest';
import { applyCRTFilter } from '../crtFilter';

// jsdom no implementa el contexto 2D del canvas, así que sólo testeamos
// las guardas de tamaño que retornan antes de tocar el contexto. Los pixel ops
// se cubren en runtime real (Lighthouse manual / smoke).

function bareCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

describe('applyCRTFilter — size guards', () => {
  it('returns source unchanged when canvas is < 4px wide', () => {
    const tiny = bareCanvas(2, 100);
    const out = applyCRTFilter(tiny, { scanlineIntensity: 0.5, rgbShift: 1, vignette: 0.3 });
    expect(out).toBe(tiny);
  });

  it('returns source unchanged when canvas is < 4px tall', () => {
    const tiny = bareCanvas(100, 2);
    const out = applyCRTFilter(tiny, { scanlineIntensity: 0.5, rgbShift: 1, vignette: 0.3 });
    expect(out).toBe(tiny);
  });

  it('returns source unchanged for 1×1', () => {
    const tiny = bareCanvas(1, 1);
    const out = applyCRTFilter(tiny);
    expect(out).toBe(tiny);
  });
});
