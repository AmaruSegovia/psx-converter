import type { ConverterSettings } from '@/types';

export type HistoryTab = 'sample' | 'dither' | 'palette' | 'colors' | 'effects';

export const KEY_TO_TAB: Record<string, HistoryTab> = {
  width: 'sample', height: 'sample', sizeMode: 'sample', sampleMode: 'sample',
  lockAspect: 'sample',
  blurAmount: 'sample', sharpenAmount: 'sample',
  alphaThreshold: 'dither', transparencyMode: 'dither', colorKeyHex: 'dither',
  distanceMetric: 'dither', ditherMode: 'dither', ditherAmount: 'dither',
  colorCount: 'palette', useKMeansPlusPlus: 'palette', palette: 'palette',
  paletteSource: 'palette', lospecSlug: 'palette',
  brightness: 'colors', contrast: 'colors', saturation: 'colors', hue: 'colors',
  gamma: 'colors', tintRed: 'colors', tintGreen: 'colors', tintBlue: 'colors',
  posterize: 'effects',
  crtEnabled: 'effects', crtScanlines: 'effects', crtRgbShift: 'effects', crtVignette: 'effects',
  grainAmount: 'effects', grainSeed: 'effects', grainSeedLocked: 'effects',
  levelsInLow: 'colors', levelsInHigh: 'colors', levelsOutLow: 'colors', levelsOutHigh: 'colors',
};

export const KEY_LABELS: Record<string, string> = {
  width: 'Width', height: 'Height', sizeMode: 'Size mode', sampleMode: 'Sample',
  lockAspect: 'Aspect lock',
  blurAmount: 'Blur', sharpenAmount: 'Sharpen',
  alphaThreshold: 'Alpha', transparencyMode: 'Transparency', colorKeyHex: 'Color key',
  distanceMetric: 'Distance', ditherMode: 'Dither', ditherAmount: 'Dither amount',
  colorCount: 'Colors', useKMeansPlusPlus: 'K-means++',
  palette: 'Palette', paletteSource: 'Palette source', lospecSlug: 'Lospec',
  brightness: 'Brightness', contrast: 'Contrast', saturation: 'Saturation',
  hue: 'Hue', gamma: 'Gamma',
  tintRed: 'Red', tintGreen: 'Green', tintBlue: 'Blue',
  posterize: 'Posterize',
  crtEnabled: 'CRT', crtScanlines: 'Scanlines', crtRgbShift: 'RGB shift', crtVignette: 'Vignette',
  grainAmount: 'Grain', grainSeed: 'Grain seed', grainSeedLocked: 'Grain lock',
  levelsInLow: 'In black', levelsInHigh: 'In white', levelsOutLow: 'Out black', levelsOutHigh: 'Out white',
};

export function findChangedKey(from: ConverterSettings, to: ConverterSettings): string | null {
  for (const key of Object.keys(KEY_TO_TAB)) {
    const k = key as keyof ConverterSettings;
    if (JSON.stringify(from[k]) !== JSON.stringify(to[k])) return key;
  }
  return null;
}

/**
 * Returns which tabs have at least one setting that differs from `defaults`.
 * Width/height are EXCLUDED from the `sample` tab check because every loaded
 * image legitimately changes them (matching to source dimensions), so flagging
 * the tab as "changed" on every load is noise.
 */
export function tabsWithChanges(
  current: ConverterSettings,
  defaults: ConverterSettings
): Record<HistoryTab, boolean> {
  const result: Record<HistoryTab, boolean> = {
    sample: false, dither: false, palette: false, colors: false, effects: false,
  };
  const SAMPLE_IGNORE = new Set(['width', 'height', 'lockAspect']);
  for (const [key, tab] of Object.entries(KEY_TO_TAB)) {
    if (tab === 'sample' && SAMPLE_IGNORE.has(key)) continue;
    const k = key as keyof ConverterSettings;
    if (JSON.stringify(current[k]) !== JSON.stringify(defaults[k])) {
      result[tab] = true;
    }
  }
  return result;
}

export function formatNumberDiff(prev: number, next: number): string {
  const diff = next - prev;
  const abs = Math.abs(diff);
  const sign = diff > 0 ? '+' : '−';
  if (abs < 0.01) return next.toFixed(2);
  if (abs < 1) return `${sign}${abs.toFixed(2)}`;
  if (abs < 10) return `${sign}${abs.toFixed(1)}`;
  return `${sign}${Math.round(abs)}`;
}

export function describeChange(key: string, prev: unknown, next: unknown): string {
  const label = KEY_LABELS[key] ?? key;

  switch (key) {
    case 'paletteSource':
      return `Palette → ${String(next)}`;
    case 'palette': {
      const n = Array.isArray(next) ? next.length : 0;
      return `Palette (${n} colors)`;
    }
    case 'ditherMode':
      return `Dither → ${String(next)}`;
    case 'distanceMetric':
      return `Distance → ${String(next)}`;
    case 'sampleMode':
      return `Sample → ${String(next)}`;
    case 'sizeMode':
      return `Size → ${String(next)}`;
    case 'transparencyMode':
      return `Transparency → ${String(next)}`;
    case 'crtEnabled':
      return next ? 'CRT on' : 'CRT off';
    case 'grainSeedLocked':
      return next ? 'Grain seed locked' : 'Grain seed unlocked';
    case 'useKMeansPlusPlus':
      return next ? 'K-means++ on' : 'K-means++ off';
    case 'colorKeyHex':
      return `Color key ${String(next)}`;
    case 'lospecSlug':
      return `Lospec ${String(next)}`;
  }

  if (typeof prev === 'number' && typeof next === 'number') {
    return `${label} ${formatNumberDiff(prev, next)}`;
  }
  return `${label} changed`;
}
