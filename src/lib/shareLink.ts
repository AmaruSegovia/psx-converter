import type { ConverterSettings, PaletteColor } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

// Short, human-readable keys for the URL hash. The map is the source of truth
// for both encode and decode — adding a setting? add it here.
const SHORT_NAMES: Record<keyof ConverterSettings, string> = {
  width: 'w',
  height: 'h',
  sizeMode: 'sz',
  sampleMode: 'sm',
  blurAmount: 'blur',
  sharpenAmount: 'sharp',
  alphaThreshold: 'at',
  transparencyMode: 'tm',
  colorKeyHex: 'ck',
  distanceMetric: 'dm',
  ditherMode: 'd',
  ditherAmount: 'da',
  colorCount: 'cc',
  useKMeansPlusPlus: 'km',
  palette: 'pal',
  paletteSource: 'ps',
  lospecSlug: 'ls',
  lockAspect: 'la',
  posterize: 'post',
  brightness: 'b',
  contrast: 'c',
  saturation: 's',
  hue: 'hu',
  gamma: 'g',
  tintRed: 'tr',
  tintGreen: 'tg',
  tintBlue: 'tb',
  crtEnabled: 'crt',
  crtScanlines: 'scan',
  crtRgbShift: 'rgb',
  crtVignette: 'vig',
  grainAmount: 'grain',
  grainSeed: 'seed',
  grainSeedLocked: 'seedl',
  levelsInLow: 'lil',
  levelsInHigh: 'lih',
  levelsOutLow: 'lol',
  levelsOutHigh: 'loh',
};

// Reverse map for decoding.
const LONG_NAMES: Record<string, keyof ConverterSettings> = Object.fromEntries(
  Object.entries(SHORT_NAMES).map(([long, short]) => [short, long as keyof ConverterSettings]),
);

function paletteEqual(a: PaletteColor[], b: PaletteColor[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].r !== b[i].r || a[i].g !== b[i].g || a[i].b !== b[i].b) return false;
  }
  return true;
}

function hexToColor(hex: string): PaletteColor {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '').padStart(6, '0').slice(0, 6).toLowerCase();
  return {
    hex: '#' + clean,
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * Encodes settings as a human-readable query-string. Only fields that differ
 * from DEFAULT_SETTINGS are included, keeping links short.
 *
 * Examples:
 *   defaults     → ""
 *   width tweak  → "w=200&h=150"
 *   custom pal   → "ps=custom&pal=ff0000.00ff00.0000ff"
 */
export function encodeSettings(settings: ConverterSettings): string {
  const parts: string[] = [];

  for (const longKey of Object.keys(SHORT_NAMES) as (keyof ConverterSettings)[]) {
    const shortKey = SHORT_NAMES[longKey];
    const value = settings[longKey];
    const def = DEFAULT_SETTINGS[longKey];

    if (longKey === 'palette') {
      const arr = value as PaletteColor[];
      if (paletteEqual(arr, def as PaletteColor[])) continue;
      if (arr.length === 0) {
        parts.push(`${shortKey}=`);
      } else {
        parts.push(`${shortKey}=${arr.map((c) => c.hex.replace('#', '').toLowerCase()).join('.')}`);
      }
      continue;
    }

    if (value === def) continue;

    if (typeof value === 'boolean') {
      parts.push(`${shortKey}=${value ? '1' : '0'}`);
    } else if (typeof value === 'string') {
      const stripped = longKey === 'colorKeyHex' ? value.replace(/^#/, '') : value;
      parts.push(`${shortKey}=${encodeURIComponent(stripped)}`);
    } else {
      parts.push(`${shortKey}=${String(value)}`);
    }
  }

  return parts.join('&');
}

/**
 * Parses a previously encoded payload back into settings. Unknown keys are
 * ignored, missing keys fall back to DEFAULT_SETTINGS, so older links keep
 * working when new fields are added.
 */
export function decodeSettings(payload: string): ConverterSettings | null {
  if (!payload) return { ...DEFAULT_SETTINGS };
  try {
    const out: Partial<ConverterSettings> = {};
    const params = new URLSearchParams(payload);

    for (const [shortKey, raw] of params.entries()) {
      const longKey = LONG_NAMES[shortKey];
      if (!longKey) continue; // unknown short — silently ignore

      const def = DEFAULT_SETTINGS[longKey];

      if (longKey === 'palette') {
        if (raw === '') {
          (out as Record<string, unknown>)[longKey] = [];
        } else {
          const colors: PaletteColor[] = raw
            .split('.')
            .filter((s) => /^[0-9a-fA-F]{1,6}$/.test(s))
            .map(hexToColor);
          (out as Record<string, unknown>)[longKey] = colors;
        }
        continue;
      }

      if (typeof def === 'boolean') {
        (out as Record<string, unknown>)[longKey] = raw === '1' || raw === 'true';
      } else if (typeof def === 'number') {
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) return null;
        (out as Record<string, unknown>)[longKey] = n;
      } else if (typeof def === 'string') {
        const decoded = decodeURIComponent(raw);
        (out as Record<string, unknown>)[longKey] =
          longKey === 'colorKeyHex' ? '#' + decoded.replace(/^#/, '') : decoded;
      }
    }

    return { ...DEFAULT_SETTINGS, ...out };
  } catch {
    return null;
  }
}

export function buildShareUrl(settings: ConverterSettings): string {
  const payload = encodeSettings(settings);
  const { origin, pathname } = window.location;
  return payload ? `${origin}${pathname}#s=${payload}` : `${origin}${pathname}`;
}

export function writeHashToUrl(settings: ConverterSettings): void {
  const payload = encodeSettings(settings);
  const next = payload
    ? `${window.location.pathname}${window.location.search}#s=${payload}`
    : `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', next);
}

export function consumeShareHashFromUrl(): ConverterSettings | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#s=')) return null;
  const payload = hash.slice(3);
  const settings = decodeSettings(payload);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return settings;
}
