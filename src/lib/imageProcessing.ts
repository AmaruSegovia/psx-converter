import type { ConverterSettings } from '@/types';
import { applyCRTFilter } from './crtFilter';

export function applyTransparency(
  imageData: ImageData,
  settings: Pick<ConverterSettings, 'transparencyMode' | 'alphaThreshold' | 'colorKeyHex'>
): ImageData {
  if (settings.transparencyMode === 'none') return imageData;
  const data = imageData.data;

  if (settings.transparencyMode === 'threshold') {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < settings.alphaThreshold) {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
      }
    }
  } else if (settings.transparencyMode === 'color-key') {
    const hex = settings.colorKeyHex.replace('#', '');
    const kr = parseInt(hex.slice(0, 2), 16);
    const kg = parseInt(hex.slice(2, 4), 16);
    const kb = parseInt(hex.slice(4, 6), 16);
    const tolerance = 15;
    for (let i = 0; i < data.length; i += 4) {
      if (
        Math.abs(data[i] - kr) <= tolerance &&
        Math.abs(data[i + 1] - kg) <= tolerance &&
        Math.abs(data[i + 2] - kb) <= tolerance
      ) {
        data[i + 3] = 0;
      }
    }
  }
  return imageData;
}

export function applyLevels(
  imageData: ImageData,
  settings: Pick<ConverterSettings, 'levelsInLow' | 'levelsInHigh' | 'levelsOutLow' | 'levelsOutHigh'>
): void {
  const { levelsInLow: inLow, levelsInHigh: inHigh, levelsOutLow: outLow, levelsOutHigh: outHigh } = settings;
  if (inLow === 0 && inHigh === 255 && outLow === 0 && outHigh === 255) return;
  const inRange = Math.max(1, inHigh - inLow);
  const outRange = outHigh - outLow;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let c = 0; c < 3; c++) {
      const norm = Math.max(0, Math.min(1, (data[i + c] - inLow) / inRange));
      data[i + c] = Math.round(outLow + norm * outRange);
    }
  }
}

export function applyGrain(imageData: ImageData, amount: number): void {
  if (amount <= 0) return;
  const data = imageData.data;
  const strength = amount * 255 * 0.25;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const noise = (Math.random() - 0.5) * 2 * strength;
    data[i]     = Math.max(0, Math.min(255, data[i]     + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
}

export function applyColorAdjustments(
  imageData: ImageData,
  settings: Pick<ConverterSettings,
    'brightness' | 'contrast' | 'saturation' |
    'hue' | 'gamma' | 'tintRed' | 'tintGreen' | 'tintBlue' | 'posterize'>
): ImageData {
  const data = imageData.data;
  const { brightness, contrast, saturation, hue, gamma, tintRed, tintGreen, tintBlue, posterize } = settings;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    // Brightness
    r = r + brightness * 255;
    g = g + brightness * 255;
    b = b + brightness * 255;

    // Contrast
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // Saturation
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;

    // Hue rotation
    if (hue !== 0) {
      const rad = (hue * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const nr = r * (0.213 + cos * 0.787 - sin * 0.213) +
                 g * (0.715 - cos * 0.715 - sin * 0.715) +
                 b * (0.072 - cos * 0.072 + sin * 0.928);
      const ng = r * (0.213 - cos * 0.213 + sin * 0.143) +
                 g * (0.715 + cos * 0.285 + sin * 0.140) +
                 b * (0.072 - cos * 0.072 - sin * 0.283);
      const nb = r * (0.213 - cos * 0.213 - sin * 0.787) +
                 g * (0.715 - cos * 0.715 + sin * 0.715) +
                 b * (0.072 + cos * 0.928 + sin * 0.072);
      r = nr; g = ng; b = nb;
    }

    // Gamma
    if (gamma !== 1.0) {
      const invGamma = 1.0 / gamma;
      r = 255 * Math.pow(Math.max(0, r / 255), invGamma);
      g = 255 * Math.pow(Math.max(0, g / 255), invGamma);
      b = 255 * Math.pow(Math.max(0, b / 255), invGamma);
    }

    // Tint
    r = (r * tintRed) / 255;
    g = (g * tintGreen) / 255;
    b = (b * tintBlue) / 255;

    // Posterize
    if (posterize >= 2) {
      const step = 255 / (posterize - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    }

    // Clamp
    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  return imageData;
}

export function applyBlur(
  canvas: HTMLCanvasElement,
  amount: number
): HTMLCanvasElement {
  if (amount <= 0) return canvas;

  const output = document.createElement('canvas');
  output.width = canvas.width;
  output.height = canvas.height;
  const ctx = output.getContext('2d')!;
  ctx.filter = `blur(${amount}px)`;
  ctx.drawImage(canvas, 0, 0);
  return output;
}

export function resizeImage(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  mode: 'nearest' | 'bilinear' | 'bicubic'
): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const ctx = output.getContext('2d')!;

  if (mode === 'nearest') {
    ctx.imageSmoothingEnabled = false;
  } else {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = mode === 'bicubic' ? 'high' : 'medium';
  }

  ctx.drawImage(canvas, 0, 0, width, height);
  return output;
}

export function applySharpen(
  canvas: HTMLCanvasElement,
  amount: number
): HTMLCanvasElement {
  if (amount <= 0) return canvas;

  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;
  const copy = new Uint8ClampedArray(data);

  const strength = amount;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const neighbors =
          copy[((y - 1) * w + x) * 4 + c] +
          copy[((y + 1) * w + x) * 4 + c] +
          copy[(y * w + (x - 1)) * 4 + c] +
          copy[(y * w + (x + 1)) * 4 + c];
        const laplacian = center - neighbors / 4;
        data[idx + c] = Math.max(0, Math.min(255, Math.round(center + laplacian * strength)));
      }
    }
  }

  const output = document.createElement('canvas');
  output.width = w;
  output.height = h;
  const outCtx = output.getContext('2d')!;
  outCtx.putImageData(imageData, 0, 0);
  return output;
}

export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d')!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function exportPNG(canvas: HTMLCanvasElement, filename = 'psx-texture.png') {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// --- Source image cache (two resolutions) ---
let _cachedSrc = '';
let _cachedFull: HTMLCanvasElement | null = null;
let _cachedPreview: HTMLCanvasElement | null = null;

function capCanvas(canvas: HTMLCanvasElement, maxDim: number): HTMLCanvasElement {
  if (canvas.width <= maxDim && canvas.height <= maxDim) return canvas;
  const scale = maxDim / Math.max(canvas.width, canvas.height);
  return resizeImage(
    canvas,
    Math.round(canvas.width * scale),
    Math.round(canvas.height * scale),
    'bilinear'
  );
}

async function ensureCache(sourceBase64: string) {
  if (_cachedSrc === sourceBase64 && _cachedFull && _cachedPreview) return;

  const img = await loadImage(sourceBase64);
  const raw = imageToCanvas(img);

  _cachedFull = capCanvas(raw, 1024);
  _cachedPreview = capCanvas(raw, 512);
  _cachedSrc = sourceBase64;
}

export async function getCachedSource(sourceBase64: string): Promise<HTMLCanvasElement> {
  await ensureCache(sourceBase64);
  return _cachedFull!;
}

export async function getCachedPreview(sourceBase64: string): Promise<HTMLCanvasElement> {
  await ensureCache(sourceBase64);
  return _cachedPreview!;
}

function getTargetDimensions(
  sourceCanvas: HTMLCanvasElement,
  settings: ConverterSettings,
): { w: number; h: number } {
  let w: number, h: number;
  if (settings.sizeMode === 'absolute') {
    w = settings.width;
    h = settings.height;
  } else {
    w = Math.round(sourceCanvas.width * (settings.width / 100));
    h = Math.round(sourceCanvas.height * (settings.height / 100));
  }
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

/** Fast preview: resize FIRST, then color adjustments on small canvas. No quantization, no base64. */
export function processFastPreview(
  sourceCanvas: HTMLCanvasElement,
  settings: ConverterSettings
): HTMLCanvasElement {
  // 1. Resize first (512→128 = 16K pixels instead of 262K)
  const { w, h } = getTargetDimensions(sourceCanvas, settings);
  let current = resizeImage(sourceCanvas, w, h, settings.sampleMode);

  // 2. Blur on small canvas
  current = applyBlur(current, settings.blurAmount);

  // 3. Transparency + levels + color adjustments + grain on small canvas (~16K pixels)
  const colorData = canvasToImageData(current);
  applyTransparency(colorData, settings);
  applyLevels(colorData, settings);
  applyColorAdjustments(colorData, settings);
  applyGrain(colorData, settings.grainAmount);
  current = imageDataToCanvas(colorData);

  // 4. Sharpen on small canvas
  current = applySharpen(current, settings.sharpenAmount);

  // 5. CRT effect
  if (settings.crtEnabled) {
    try {
      current = applyCRTFilter(current, {
        scanlineIntensity: settings.crtScanlines,
        rgbShift: settings.crtRgbShift,
        vignette: settings.crtVignette,
      });
    } catch { /* CRT failed, skip */ }
  }

  return current;
}

/** Full quality: everything including quantization. */
export async function processFullPipeline(
  sourceBase64: string,
  settings: ConverterSettings
): Promise<{ resultBase64: string; resultCanvas: HTMLCanvasElement; generatedPalette: import('@/types').PaletteColor[] }> {
  const { default: quantizeImage } = await import('./quantization');

  const sourceCanvas = await getCachedSource(sourceBase64);

  // Transparency + levels + color adjustments
  const colorData = canvasToImageData(sourceCanvas);
  applyTransparency(colorData, settings);
  applyLevels(colorData, settings);
  applyColorAdjustments(colorData, settings);
  let current = imageDataToCanvas(colorData);

  // Blur
  current = applyBlur(current, settings.blurAmount);

  // Resize
  const { w, h } = getTargetDimensions(sourceCanvas, settings);
  current = resizeImage(current, w, h, settings.sampleMode);

  // Sharpen
  current = applySharpen(current, settings.sharpenAmount);

  // Grain (after quantization for full pipeline feel, applied pre-quantize for consistency)
  const preQuantData = canvasToImageData(current);
  applyGrain(preQuantData, settings.grainAmount);
  current = imageDataToCanvas(preQuantData);

  // Quantization
  const quantData = canvasToImageData(current);
  const { imageData: quantized, generatedPalette } = await quantizeImage(quantData, settings);
  let resultCanvas = imageDataToCanvas(quantized);

  // CRT effect
  if (settings.crtEnabled) {
    try {
      resultCanvas = applyCRTFilter(resultCanvas, {
        scanlineIntensity: settings.crtScanlines,
        rgbShift: settings.crtRgbShift,
        vignette: settings.crtVignette,
      });
    } catch { /* CRT failed, skip */ }
  }

  const resultBase64 = resultCanvas.toDataURL('image/png');
  return { resultBase64, resultCanvas, generatedPalette };
}
