import { describe, it, expect } from 'vitest';
import {
  extractUniqueColors,
  getBayerMatrix,
  applyBayerPreProcess,
} from '../quantization';

function makeImageData(pixels: number[][]): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((p, i) => {
    data[i * 4]     = p[0];
    data[i * 4 + 1] = p[1];
    data[i * 4 + 2] = p[2];
    data[i * 4 + 3] = p[3];
  });
  return new ImageData(data, pixels.length, 1);
}

describe('extractUniqueColors', () => {
  it('returns unique opaque RGB triples', () => {
    const img = makeImageData([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 255, 0, 255],
    ]);
    const colors = extractUniqueColors(img);
    expect(colors).toHaveLength(2);
    expect(colors[0].hex).toBe('#ff0000');
    expect(colors[1].hex).toBe('#00ff00');
  });

  it('skips fully-transparent pixels', () => {
    const img = makeImageData([
      [255, 0, 0, 0],
      [0, 255, 0, 255],
    ]);
    const colors = extractUniqueColors(img);
    expect(colors).toHaveLength(1);
    expect(colors[0].hex).toBe('#00ff00');
  });

  it('emits hex with zero-padded channels', () => {
    const img = makeImageData([[1, 2, 3, 255]]);
    const colors = extractUniqueColors(img);
    expect(colors[0].hex).toBe('#010203');
  });
});

describe('getBayerMatrix', () => {
  it('returns 2x2 / 4x4 / 8x8 sized matrices', () => {
    expect(getBayerMatrix('bayer-2x2')).toHaveLength(2);
    expect(getBayerMatrix('bayer-4x4')).toHaveLength(4);
    expect(getBayerMatrix('bayer-8x8')).toHaveLength(8);
    expect(getBayerMatrix('bayer-8x8')[0]).toHaveLength(8);
  });
});

describe('applyBayerPreProcess', () => {
  it('perturbs RGB but does not touch alpha', () => {
    const img = makeImageData([[128, 128, 128, 200]]);
    applyBayerPreProcess(img, getBayerMatrix('bayer-2x2'));
    expect(img.data[3]).toBe(200);
  });

  it('clamps within 0..255', () => {
    const img = makeImageData([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ]);
    applyBayerPreProcess(img, getBayerMatrix('bayer-4x4'));
    for (let i = 0; i < img.data.length; i++) {
      expect(img.data[i]).toBeGreaterThanOrEqual(0);
      expect(img.data[i]).toBeLessThanOrEqual(255);
    }
  });
});
