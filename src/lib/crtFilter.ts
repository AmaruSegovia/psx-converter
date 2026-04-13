/**
 * Lightweight CRT effect — scanlines + slight RGB shift + vignette.
 * Applied as a post-process on a canvas. Pure Canvas 2D, no WebGL.
 */
export function applyCRTFilter(
  source: HTMLCanvasElement,
  options: {
    scanlineIntensity?: number;
    rgbShift?: number;
    vignette?: number;
  } = {}
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;

  // Guard: return source unchanged if too small
  if (w < 4 || h < 4) return source;

  const {
    scanlineIntensity = 0.15,
    rgbShift = 1,
    vignette = 0.3,
  } = options;

  const output = document.createElement('canvas');
  output.width = w;
  output.height = h;
  const ctx = output.getContext('2d');
  if (!ctx) return source;

  // Draw source first
  ctx.drawImage(source, 0, 0);

  // RGB chromatic aberration
  const shift = Math.round(rgbShift);
  if (shift > 0 && w > shift * 2) {
    const srcData = ctx.getImageData(0, 0, w, h);
    const s = srcData.data;
    const dstData = new Uint8ClampedArray(s.length);

    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = (row + x) * 4;
        // Red shifted left, green center, blue shifted right
        dstData[i]     = s[(row + Math.max(0, x - shift)) * 4];
        dstData[i + 1] = s[i + 1];
        dstData[i + 2] = s[(row + Math.min(w - 1, x + shift)) * 4 + 2];
        dstData[i + 3] = s[i + 3];
      }
    }
    ctx.putImageData(new ImageData(dstData, w, h), 0, 0);
  }

  // Scanlines — every other row gets darkened
  if (scanlineIntensity > 0) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, scanlineIntensity)})`;
    for (let y = 0; y < h; y += 2) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  // Vignette — radial darkening at edges
  if (vignette > 0) {
    const inner = Math.min(w, h) * 0.3;
    const outer = Math.max(w, h) * 0.7;
    if (outer > inner) {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, inner, w / 2, h / 2, outer);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${Math.min(1, vignette)})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  }

  return output;
}
