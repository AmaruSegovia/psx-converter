import * as iq from 'image-q';
import type { ConverterSettings, PaletteColor } from '@/types';

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

export default async function quantizeImage(
  imageData: ImageData,
  settings: Pick<ConverterSettings,
    'colorCount' | 'ditherMode' | 'ditherAmount' |
    'distanceMetric' | 'palette' | 'useKMeansPlusPlus' | 'alphaThreshold'>
): Promise<ImageData> {
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
  } else {
    const imageQuantizer = getDitherer(settings.ditherMode, distanceCalculator);
    ditheredResult = imageQuantizer.quantizeSync(pointContainer, palette);
  }

  // Dither amount blending: mix dithered with non-dithered
  if (settings.ditherAmount < 1.0 && settings.ditherMode !== 'none') {
    const noDitherQuantizer = new iq.image.NearestColor(distanceCalculator);
    const noDitherResult = noDitherQuantizer.quantizeSync(pointContainer, palette);

    const ditheredArr = ditheredResult.toUint8Array();
    const noDitherArr = noDitherResult.toUint8Array();
    const amount = settings.ditherAmount;

    for (let i = 0; i < ditheredArr.length; i++) {
      ditheredArr[i] = Math.round(noDitherArr[i] * (1 - amount) + ditheredArr[i] * amount);
    }

    return new ImageData(
      new Uint8ClampedArray(ditheredArr),
      imageData.width,
      imageData.height
    );
  }

  return new ImageData(
    new Uint8ClampedArray(ditheredResult.toUint8Array()),
    imageData.width,
    imageData.height
  );
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
    case 'bayer-2x2':
    case 'bayer-4x4':
    case 'bayer-8x8':
      return new iq.image.ErrorDiffusionArray(
        distance,
        iq.image.ErrorDiffusionArrayKernel.Stucki
      );
    default:
      return new iq.image.NearestColor(distance);
  }
}
