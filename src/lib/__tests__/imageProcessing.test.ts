import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyColorAdjustments,
  applyLevels,
  applyGrain,
  applyTransparency,
} from '../imageProcessing';
import { DEFAULT_SETTINGS } from '@/types';

function makeImageData(pixels: number[][]): ImageData {
  // pixels: array of [r,g,b,a] arrays
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((p, i) => {
    data[i * 4]     = p[0];
    data[i * 4 + 1] = p[1];
    data[i * 4 + 2] = p[2];
    data[i * 4 + 3] = p[3];
  });
  return new ImageData(data, pixels.length, 1);
}

describe('applyColorAdjustments', () => {
  it('returns input unchanged with defaults', () => {
    const img = makeImageData([[100, 150, 200, 255]]);
    applyColorAdjustments(img, {
      brightness: 0, contrast: 1, saturation: 1, hue: 0, gamma: 1,
      tintRed: 255, tintGreen: 255, tintBlue: 255, posterize: 0,
    });
    expect(img.data[0]).toBe(100);
    expect(img.data[1]).toBe(150);
    expect(img.data[2]).toBe(200);
  });

  it('brightness +1 saturates to 255', () => {
    const img = makeImageData([[10, 20, 30, 255]]);
    applyColorAdjustments(img, {
      brightness: 1, contrast: 1, saturation: 1, hue: 0, gamma: 1,
      tintRed: 255, tintGreen: 255, tintBlue: 255, posterize: 0,
    });
    expect(img.data[0]).toBe(255);
    expect(img.data[1]).toBe(255);
    expect(img.data[2]).toBe(255);
  });

  it('brightness -1 clamps to 0', () => {
    const img = makeImageData([[100, 100, 100, 255]]);
    applyColorAdjustments(img, {
      brightness: -1, contrast: 1, saturation: 1, hue: 0, gamma: 1,
      tintRed: 255, tintGreen: 255, tintBlue: 255, posterize: 0,
    });
    expect(img.data[0]).toBe(0);
  });

  it('saturation 0 collapses to luminance', () => {
    const img = makeImageData([[200, 100, 50, 255]]);
    applyColorAdjustments(img, {
      brightness: 0, contrast: 1, saturation: 0, hue: 0, gamma: 1,
      tintRed: 255, tintGreen: 255, tintBlue: 255, posterize: 0,
    });
    expect(img.data[0]).toBe(img.data[1]);
    expect(img.data[1]).toBe(img.data[2]);
  });

  it('tint scales channels proportionally', () => {
    const img = makeImageData([[200, 200, 200, 255]]);
    applyColorAdjustments(img, {
      brightness: 0, contrast: 1, saturation: 1, hue: 0, gamma: 1,
      tintRed: 128, tintGreen: 255, tintBlue: 255, posterize: 0,
    });
    expect(img.data[0]).toBeLessThan(200);
    expect(img.data[1]).toBe(200);
  });

  it('posterize quantizes channels into N levels', () => {
    const img = makeImageData([[10, 130, 250, 255]]);
    applyColorAdjustments(img, {
      brightness: 0, contrast: 1, saturation: 1, hue: 0, gamma: 1,
      tintRed: 255, tintGreen: 255, tintBlue: 255, posterize: 2,
    });
    // posterize=2 → step 255 → values become 0 or 255
    [0, 1, 2].forEach((c) => {
      expect([0, 255]).toContain(img.data[c]);
    });
  });
});

describe('applyLevels', () => {
  it('is a no-op with default range', () => {
    const img = makeImageData([[50, 100, 200, 255]]);
    applyLevels(img, { levelsInLow: 0, levelsInHigh: 255, levelsOutLow: 0, levelsOutHigh: 255 });
    expect(img.data[0]).toBe(50);
    expect(img.data[1]).toBe(100);
    expect(img.data[2]).toBe(200);
  });

  it('crushes blacks below input low to output low', () => {
    const img = makeImageData([[10, 50, 50, 255]]);
    applyLevels(img, { levelsInLow: 30, levelsInHigh: 255, levelsOutLow: 0, levelsOutHigh: 255 });
    expect(img.data[0]).toBe(0);
  });

  it('input range remap stretches contrast', () => {
    const img = makeImageData([[128, 128, 128, 255]]);
    applyLevels(img, { levelsInLow: 64, levelsInHigh: 192, levelsOutLow: 0, levelsOutHigh: 255 });
    // (128-64)/(192-64)=0.5 → 0 + 0.5*255 = ~128
    expect(Math.abs(img.data[0] - 128)).toBeLessThan(2);
  });

  it('skips fully-transparent pixels', () => {
    const img = makeImageData([[100, 100, 100, 0]]);
    applyLevels(img, { levelsInLow: 50, levelsInHigh: 100, levelsOutLow: 0, levelsOutHigh: 255 });
    expect(img.data[0]).toBe(100);
  });
});

describe('applyGrain', () => {
  beforeEach(() => {
    let seed = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed + 0.3) % 1;
      return seed;
    });
  });

  it('amount=0 is no-op', () => {
    const img = makeImageData([[100, 100, 100, 255]]);
    applyGrain(img, 0);
    expect(img.data[0]).toBe(100);
  });

  it('amount>0 perturbs values', () => {
    const img = makeImageData([
      [100, 100, 100, 255],
      [100, 100, 100, 255],
      [100, 100, 100, 255],
    ]);
    applyGrain(img, 0.5);
    const samples = [img.data[0], img.data[4], img.data[8]];
    // At least one pixel must differ from 100
    expect(samples.some((v) => v !== 100)).toBe(true);
  });

  it('preserves transparent pixels', () => {
    const img = makeImageData([[100, 100, 100, 0]]);
    applyGrain(img, 1);
    expect(img.data[0]).toBe(100);
    expect(img.data[3]).toBe(0);
  });
});

describe('applyTransparency', () => {
  it('mode none is a no-op', () => {
    const img = makeImageData([[100, 100, 100, 50]]);
    applyTransparency(img, { transparencyMode: 'none', alphaThreshold: 128, colorKeyHex: '#ff00ff' });
    expect(img.data[3]).toBe(50);
  });

  it('threshold mode zeroes pixels below alphaThreshold', () => {
    const img = makeImageData([
      [100, 100, 100, 50],
      [100, 100, 100, 200],
    ]);
    applyTransparency(img, { transparencyMode: 'threshold', alphaThreshold: 128, colorKeyHex: '#ff00ff' });
    expect(img.data[3]).toBe(0);
    expect(img.data[7]).toBe(200);
  });

  it('color-key zeroes alpha for pixels matching key within tolerance', () => {
    const img = makeImageData([
      [255, 0, 255, 255],   // exact key
      [250, 5, 250, 255],   // close
      [10, 200, 30, 255],   // far
    ]);
    applyTransparency(img, { transparencyMode: 'color-key', alphaThreshold: 128, colorKeyHex: '#ff00ff' });
    expect(img.data[3]).toBe(0);
    expect(img.data[7]).toBe(0);
    expect(img.data[11]).toBe(255);
  });
});

describe('DEFAULT_SETTINGS shape', () => {
  it('does not include removed sampleOffsets', () => {
    expect('sampleOffsetX' in DEFAULT_SETTINGS).toBe(false);
    expect('sampleOffsetY' in DEFAULT_SETTINGS).toBe(false);
  });
});
