import { describe, it, expect } from 'vitest';
import { findChangedKey, formatNumberDiff, describeChange, KEY_TO_TAB } from '../historyLabels';
import { DEFAULT_SETTINGS } from '@/types';

describe('formatNumberDiff', () => {
  it('shows decimals for tiny diffs', () => {
    expect(formatNumberDiff(0, 0.5)).toBe('+0.50');
  });

  it('shows one decimal for diffs <10', () => {
    expect(formatNumberDiff(1, 4.5)).toBe('+3.5');
  });

  it('shows integers for big diffs', () => {
    expect(formatNumberDiff(0, 50)).toBe('+50');
  });

  it('uses minus sign for decreases', () => {
    expect(formatNumberDiff(50, 0)).toBe('−50');
  });

  it('returns absolute value when diff is negligible', () => {
    expect(formatNumberDiff(1.0, 1.0)).toBe('1.00');
  });
});

describe('findChangedKey', () => {
  it('returns null when settings are identical', () => {
    expect(findChangedKey(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS })).toBeNull();
  });

  it('detects single-key change', () => {
    const next = { ...DEFAULT_SETTINGS, brightness: 0.5 };
    expect(findChangedKey(DEFAULT_SETTINGS, next)).toBe('brightness');
  });

  it('detects palette array change', () => {
    const next = { ...DEFAULT_SETTINGS, palette: [{ r: 1, g: 1, b: 1, hex: '#010101' }] };
    expect(findChangedKey(DEFAULT_SETTINGS, next)).toBe('palette');
  });
});

describe('describeChange', () => {
  it('paletteSource → value', () => {
    expect(describeChange('paletteSource', 'generated', 'lospec')).toBe('Palette → lospec');
  });

  it('palette returns count', () => {
    expect(describeChange('palette', [], [{ r: 0, g: 0, b: 0, hex: '#000000' }])).toBe('Palette (1 colors)');
  });

  it('crtEnabled boolean → on/off', () => {
    expect(describeChange('crtEnabled', false, true)).toBe('CRT on');
    expect(describeChange('crtEnabled', true, false)).toBe('CRT off');
  });

  it('numeric label uses formatNumberDiff', () => {
    expect(describeChange('brightness', 0, 0.5)).toBe('Brightness +0.50');
  });

  it('falls back to "key changed" for unknown types', () => {
    expect(describeChange('width', 'a', 'b')).toBe('Width changed');
  });
});

describe('KEY_TO_TAB', () => {
  it('does not contain removed sampleOffsetX/Y', () => {
    expect(KEY_TO_TAB.sampleOffsetX).toBeUndefined();
    expect(KEY_TO_TAB.sampleOffsetY).toBeUndefined();
  });

  it('every key in KEY_TO_TAB exists in DEFAULT_SETTINGS', () => {
    for (const k of Object.keys(KEY_TO_TAB)) {
      expect(DEFAULT_SETTINGS, `missing ${k} in DEFAULT_SETTINGS`).toHaveProperty(k);
    }
  });
});
