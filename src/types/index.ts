export interface ConverterSettings {
  // Tab Sample
  width: number;
  height: number;
  sizeMode: 'absolute' | 'relative';
  sampleMode: 'nearest' | 'bilinear' | 'bicubic';
  sampleOffsetX: number;
  sampleOffsetY: number;
  blurAmount: number;
  sharpenAmount: number;

  // Tab Dither
  alphaThreshold: number;
  distanceMetric: 'euclidean' | 'manhattan' | 'ciede2000' | 'rgb-redmean';
  ditherMode: 'none' | 'floyd-steinberg' | 'jarvis' | 'bayer-2x2' | 'bayer-4x4' | 'bayer-8x8';
  ditherAmount: number;

  // Tab Palette
  colorCount: number;
  useKMeansPlusPlus: boolean;
  palette: PaletteColor[];
  paletteSource: 'generated' | 'lospec' | 'builtin' | 'custom';
  lospecSlug: string;

  // Tab Colors
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  gamma: number;
  tintRed: number;
  tintGreen: number;
  tintBlue: number;

  // CRT Effect
  crtEnabled: boolean;
  crtScanlines: number;   // 0-1
  crtRgbShift: number;    // 0-5 px
  crtVignette: number;    // 0-1
}

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export interface Preset {
  id: string;
  name: string;
  settings: ConverterSettings;
  thumbnail?: string;
  createdAt: number;
}

export interface LospecPaletteResponse {
  name: string;
  author: string;
  colors: string[];
}

export const DEFAULT_SETTINGS: ConverterSettings = {
  width: 128,
  height: 128,
  sizeMode: 'absolute',
  sampleMode: 'nearest',
  sampleOffsetX: 0,
  sampleOffsetY: 0,
  blurAmount: 0,
  sharpenAmount: 0,
  alphaThreshold: 128,
  distanceMetric: 'rgb-redmean',
  ditherMode: 'floyd-steinberg',
  ditherAmount: 0.2,
  colorCount: 16,
  useKMeansPlusPlus: false,
  palette: [],
  paletteSource: 'generated',
  lospecSlug: '',
  brightness: 0,
  contrast: 1.0,
  saturation: 1.0,
  hue: 0,
  gamma: 1.0,
  tintRed: 255,
  tintGreen: 255,
  tintBlue: 255,
  crtEnabled: false,
  crtScanlines: 0.15,
  crtRgbShift: 1,
  crtVignette: 0.3,
};
