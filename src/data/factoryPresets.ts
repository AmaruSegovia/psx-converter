import type { ConverterSettings, PaletteColor } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { BUILTIN_PALETTES } from './builtinPalettes';

export interface FactoryPreset {
  id: string;
  name: string;
  description: string;
  settings: ConverterSettings;
  /** Representative colors for the visual thumbnail (independent of the actual palette). */
  thumbnailColors: string[];
}

function hexToColor(hex: string): PaletteColor {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    hex: `#${h.toLowerCase()}`,
  };
}

function paletteBySlug(slug: string): PaletteColor[] {
  const p = BUILTIN_PALETTES.find((b) => b.slug === slug);
  return p ? p.colors.map(hexToColor) : [];
}

function make(overrides: Partial<ConverterSettings>): ConverterSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

/**
 * Factory presets designed to work on any source image.
 *
 * Design rules:
 *  - Prefer `paletteSource: 'generated'` (auto-extracts from image) so the
 *    preset doesn't force unrelated colors onto a colorful photo.
 *  - Forced palettes only when the palette IS the look (GameBoy, Sweetie).
 *  - Avoid posterize + palette quantization together (double reduction = mush).
 *  - Vibe comes from color grading + dither + grain + CRT, not from locked hues.
 */
export const FACTORY_PRESETS: FactoryPreset[] = [
  {
    id: 'factory-psx-classic',
    name: 'PSX Classic',
    description: '128px · 16 colors · authentic PSX',
    thumbnailColors: [
      '#2d2520', '#5a4a3d', '#8b7355', '#a89070',
      '#465159', '#6b7b8b', '#9b6b4c', '#c5b8a0',
    ],
    settings: make({
      width: 128,
      height: 128,
      lockAspect: true,
      colorCount: 16,
      ditherMode: 'floyd-steinberg',
      ditherAmount: 0.3,
      paletteSource: 'generated',
      palette: [],
      sampleMode: 'nearest',
      blurAmount: 0.2,
      contrast: 1.05,
      saturation: 0.92,
    }),
  },
  {
    id: 'factory-psx-horror',
    name: 'PSX Horror',
    description: 'Silent Hill fog · desat + grain + CRT',
    thumbnailColors: [
      '#1c1410', '#2d1f14', '#3d2b1a', '#5f4226',
      '#816034', '#a39566', '#c5c89a', '#d8c8a0',
    ],
    settings: make({
      width: 128,
      height: 128,
      lockAspect: true,
      colorCount: 16,
      ditherMode: 'floyd-steinberg',
      ditherAmount: 0.4,
      paletteSource: 'generated',
      palette: [],
      sampleMode: 'nearest',
      blurAmount: 0.35,
      brightness: 0.06,
      contrast: 1.08,
      saturation: 0.6,
      gamma: 1.0,
      tintRed: 250,
      tintGreen: 230,
      tintBlue: 205,
      grainAmount: 0.25,
      crtEnabled: true,
      crtScanlines: 0.12,
      crtRgbShift: 1,
      crtVignette: 0.28,
    }),
  },
  {
    id: 'factory-doomer',
    name: 'Doomer',
    description: 'Cold blue-gray · desat melancholy',
    thumbnailColors: [
      '#0f1419', '#1a2332', '#2d3a4d', '#4a5a70',
      '#6b7d92', '#8a9aac', '#a8b6c4', '#c5cdd6',
    ],
    settings: make({
      width: 160,
      height: 160,
      lockAspect: true,
      colorCount: 16,
      ditherMode: 'floyd-steinberg',
      ditherAmount: 0.35,
      paletteSource: 'generated',
      palette: [],
      sampleMode: 'bilinear',
      blurAmount: 0.5,
      brightness: -0.02,
      contrast: 1.05,
      saturation: 0.3,
      gamma: 1.0,
      tintRed: 215,
      tintGreen: 232,
      tintBlue: 255,
      grainAmount: 0.18,
      crtEnabled: true,
      crtScanlines: 0,
      crtRgbShift: 0,
      crtVignette: 0.45,
    }),
  },
  {
    id: 'factory-n64',
    name: 'N64 Bilinear',
    description: '64px · blurry filter · 32 colors',
    thumbnailColors: [
      '#7a8b9a', '#a3b5b0', '#c5b89a', '#9a8b7a',
      '#5a6b7a', '#8b9a8b', '#b0a395', '#7a8b8b',
    ],
    settings: make({
      width: 64,
      height: 64,
      lockAspect: true,
      colorCount: 32,
      ditherMode: 'none',
      paletteSource: 'generated',
      palette: [],
      sampleMode: 'bilinear',
      blurAmount: 0.6,
      saturation: 1.1,
    }),
  },
  {
    id: 'factory-arcade-crt',
    name: 'Arcade CRT',
    description: 'Punchy colors · heavy scanlines',
    thumbnailColors: [
      '#ff2d2d', '#2dff2d', '#2d2dff', '#ffd92d',
      '#ff2dff', '#2dffff', '#ff8800', '#ffffff',
    ],
    settings: make({
      width: 256,
      height: 256,
      lockAspect: true,
      colorCount: 32,
      ditherMode: 'floyd-steinberg',
      ditherAmount: 0.22,
      paletteSource: 'generated',
      palette: [],
      sampleMode: 'nearest',
      contrast: 1.2,
      saturation: 1.35,
      crtEnabled: true,
      crtScanlines: 0.35,
      crtRgbShift: 2.5,
      crtVignette: 0.6,
    }),
  },
  {
    id: 'factory-sweetie16',
    name: 'Sweetie 16',
    description: 'Pixel art · 16-color curated palette',
    thumbnailColors: [
      '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
      '#ffcd75', '#a7f070', '#41a6f6', '#73eff7',
    ],
    settings: make({
      width: 128,
      height: 128,
      lockAspect: true,
      colorCount: 16,
      ditherMode: 'floyd-steinberg',
      ditherAmount: 0.15,
      paletteSource: 'builtin',
      palette: paletteBySlug('sweetie-16'),
      sampleMode: 'nearest',
      saturation: 1.1,
      contrast: 1.05,
    }),
  },
  {
    id: 'factory-polaroid',
    name: 'Polaroid',
    description: 'Vintage warm · faded · soft grain',
    thumbnailColors: [
      '#1a0a0a', '#4a1a0a', '#8b3a1a', '#b06040',
      '#d0a080', '#f0e0c0', '#e0a060', '#a04010',
    ],
    settings: make({
      width: 192,
      height: 192,
      lockAspect: true,
      colorCount: 16,
      ditherMode: 'jarvis',
      ditherAmount: 0.2,
      paletteSource: 'builtin',
      palette: paletteBySlug('psx-warm'),
      sampleMode: 'bilinear',
      blurAmount: 0.4,
      brightness: 0.03,
      contrast: 0.95,
      saturation: 0.85,
      gamma: 1.15,
      grainAmount: 0.18,
      crtEnabled: true,
      crtScanlines: 0,
      crtRgbShift: 0,
      crtVignette: 0.35,
    }),
  },
  {
    id: 'factory-dreamy',
    name: 'Dreamy',
    description: 'Soft pastel · blurred · 48 colors',
    thumbnailColors: [
      '#ffd6e8', '#d6f0ff', '#fff6d6', '#e8d6ff',
      '#d6ffe8', '#ffe6d6', '#f0d6ff', '#d6ffe0',
    ],
    settings: make({
      width: 192,
      height: 192,
      lockAspect: true,
      colorCount: 48,
      ditherMode: 'jarvis',
      ditherAmount: 0.15,
      paletteSource: 'generated',
      palette: [],
      sampleMode: 'bilinear',
      blurAmount: 1.2,
      brightness: 0.04,
      contrast: 0.95,
      saturation: 0.9,
      gamma: 1.1,
    }),
  },
];
