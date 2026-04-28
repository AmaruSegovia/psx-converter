import UPNG from 'upng-js';
import type { PaletteColor } from '@/types';

/**
 * Encode the canvas as PNG-8 (indexed) using the provided palette as a hint
 * for UPNG's quantizer. Falls back to lossless if `palette.length === 0`.
 *
 * Note: UPNG does its own quantization with `cnum`; passing the exact palette
 * size produces near-identical visual output to the input canvas while
 * benefiting from PNG-8's smaller file size (typically 30-60% of PNG-24).
 */
export function buildIndexedPng(
  canvas: HTMLCanvasElement,
  palette: PaletteColor[]
): ArrayBuffer {
  if (palette.length > 256) {
    throw new Error('Indexed PNG requires ≤256 palette colors');
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cnum = palette.length === 0 ? 0 : palette.length;
  const buf = new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  return UPNG.encode([buf.buffer], width, height, cnum);
}

export function downloadIndexedPng(
  canvas: HTMLCanvasElement,
  palette: PaletteColor[],
  filename: string
): boolean {
  try {
    const arrayBuf = buildIndexedPng(canvas, palette);
    const blob = new Blob([arrayBuf], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('Indexed PNG export failed:', e);
    return false;
  }
}
