import * as iq from 'image-q';
import type { ConverterSettings, PaletteColor } from '@/types';

// --- Bayer ordered dithering matrices ---
const BAYER_2X2 = [[0, 2], [3, 1]];
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];
const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function getBayerMatrix(mode: 'bayer-2x2' | 'bayer-4x4' | 'bayer-8x8'): number[][] {
  switch (mode) {
    case 'bayer-2x2': return BAYER_2X2;
    case 'bayer-4x4': return BAYER_4X4;
    case 'bayer-8x8': return BAYER_8X8;
  }
}

function applyBayerPreProcess(imageData: ImageData, matrix: number[][]): void {
  const data = imageData.data;
  const size = matrix.length;
  const n = size * size;
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const idx = (y * imageData.width + x) * 4;
      const threshold = (matrix[y % size][x % size] / n - 0.5) * 255;
      data[idx]     = Math.max(0, Math.min(255, data[idx]     + threshold));
      data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + threshold));
      data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + threshold));
    }
  }
}

function getDistanceCalculator(metric: ConverterSettings['distanceMetric']): iq.distance.AbstractDistanceCalculator {
  switch (metric) {
    case 'euclidean': return new iq.distance.Euclidean();
    case 'manhattan': return new iq.distance.Manhattan();
    case 'ciede2000': return new iq.distance.CIEDE2000();
    case 'rgb-redmean': return new iq.distance.EuclideanBT709NoAlpha();
    default: return new iq.distance.Euclidean();
  }
}

function createPaletteFromColors(colors: PaletteColor[]): iq.utils.Palette {
  const palette = new iq.utils.Palette();
  for (const c of colors) {
    const point = iq.utils.Point.createByRGBA(c.r, c.g, c.b, 255);
    palette.add(point);
  }
  return palette;
}

function extractUniqueColors(imageData: ImageData): PaletteColor[] {
  const seen = new Set<number>();
  const colors: PaletteColor[] = [];
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    if (!seen.has(key)) {
      seen.add(key);
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const hex = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
      colors.push({ r, g, b, hex });
    }
  }
  return colors;
}

export default async function quantizeImage(
  imageData: ImageData,
  settings: Pick<ConverterSettings,
    'colorCount' | 'ditherMode' | 'ditherAmount' |
    'distanceMetric' | 'palette' | 'useKMeansPlusPlus' | 'alphaThreshold'>
): Promise<{ imageData: ImageData; generatedPalette: PaletteColor[] }> {
  // Capture original alpha channel — image-q returns alpha=255 for all pixels
  const pixelCount = imageData.width * imageData.height;
  const alphaChannel = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    alphaChannel[i] = imageData.data[i * 4 + 3];
  }

  const pointContainer = iq.utils.PointContainer.fromUint8Array(
    imageData.data,
    imageData.width,
    imageData.height
  );

  const distanceCalculator = getDistanceCalculator(settings.distanceMetric);

  // Get palette: custom or generated
  let palette: iq.utils.Palette;

  if (settings.palette.length > 0) {
    palette = createPaletteFromColors(settings.palette);
  } else {
    const paletteQuantizer = settings.useKMeansPlusPlus
      ? new iq.palette.WuQuant(distanceCalculator, settings.colorCount)
      : new iq.palette.RGBQuant(distanceCalculator, settings.colorCount);

    paletteQuantizer.sample(pointContainer);
    palette = paletteQuantizer.quantizeSync();
  }

  // Quantize with dithering
  let ditheredResult: iq.utils.PointContainer;

  if (settings.ditherMode === 'none') {
    const imageQuantizer = new iq.image.NearestColor(distanceCalculator);
    ditheredResult = imageQuantizer.quantizeSync(pointContainer, palette);
  } else if (settings.ditherMode.startsWith('bayer-')) {
    // TRUE Bayer ordered dithering: pre-perturb pixels, then NearestColor
    const bayerInput = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    applyBayerPreProcess(bayerInput, getBayerMatrix(settings.ditherMode as 'bayer-2x2' | 'bayer-4x4' | 'bayer-8x8'));
    const bayerContainer = iq.utils.PointContainer.fromUint8Array(
      bayerInput.data, imageData.width, imageData.height
    );
    const nearestColor = new iq.image.NearestColor(distanceCalculator);
    ditheredResult = nearestColor.quantizeSync(bayerContainer, palette);
  } else {
    const imageQuantizer = getDitherer(settings.ditherMode, distanceCalculator);
    ditheredResult = imageQuantizer.quantizeSync(pointContainer, palette);
  }

  // Helper to build final ImageData with restored alpha
  const buildResult = (rgbaArr: Uint8Array | Uint8ClampedArray): ImageData => {
    const result = new Uint8ClampedArray(rgbaArr);
    for (let i = 0; i < pixelCount; i++) {
      result[i * 4 + 3] = alphaChannel[i];
    }
    return new ImageData(result, imageData.width, imageData.height);
  };

  // Dither amount blending: mix dithered with non-dithered
  let finalImageData: ImageData;

  if (settings.ditherAmount < 1.0 && settings.ditherMode !== 'none') {
    const noDitherQuantizer = new iq.image.NearestColor(distanceCalculator);
    const noDitherResult = noDitherQuantizer.quantizeSync(pointContainer, palette);

    const ditheredArr = ditheredResult.toUint8Array();
    const noDitherArr = noDitherResult.toUint8Array();
    const amount = settings.ditherAmount;

    for (let i = 0; i < ditheredArr.length; i++) {
      ditheredArr[i] = Math.round(noDitherArr[i] * (1 - amount) + ditheredArr[i] * amount);
    }

    finalImageData = buildResult(ditheredArr);
  } else {
    finalImageData = buildResult(ditheredResult.toUint8Array());
  }

  const generatedPalette = extractUniqueColors(finalImageData);
  return { imageData: finalImageData, generatedPalette };
}

function getDitherer(
  mode: ConverterSettings['ditherMode'],
  distance: iq.distance.AbstractDistanceCalculator
): iq.image.ErrorDiffusionArray | iq.image.NearestColor {
  switch (mode) {
    case 'floyd-steinberg':
      return new iq.image.ErrorDiffusionArray(
        distance,
        iq.image.ErrorDiffusionArrayKernel.FloydSteinberg
      );
    case 'jarvis':
      return new iq.image.ErrorDiffusionArray(
        distance,
        iq.image.ErrorDiffusionArrayKernel.Jarvis
      );
    default:
      return new iq.image.NearestColor(distance);
  }
}
