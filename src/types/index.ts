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
  transparencyMode: 'none' | 'threshold' | 'color-key';
  colorKeyHex: string;
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
  posterize: number;
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

  // Grain
  grainAmount: number;    // 0-1

  // Levels
  levelsInLow: number;    // 0-254
  levelsInHigh: number;   // 1-255
  levelsOutLow: number;   // 0-254
  levelsOutHigh: number;  // 1-255
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

export interface ExampleImage {
  id: string;
  name: string;
  filename: string;
  suggestedSettings: Partial<ConverterSettings>;
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
  transparencyMode: 'none',
  colorKeyHex: '#FF00FF',
  distanceMetric: 'rgb-redmean',
  ditherMode: 'floyd-steinberg',
  ditherAmount: 0.2,
  colorCount: 16,
  useKMeansPlusPlus: false,
  palette: [],
  paletteSource: 'generated',
  lospecSlug: '',
  posterize: 0,
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
  grainAmount: 0,
  levelsInLow: 0,
  levelsInHigh: 255,
  levelsOutLow: 0,
  levelsOutHigh: 255,
};
