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

// Tiny seeded PRNG. Same seed → same sequence → reproducible export.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function applyGrain(imageData: ImageData, amount: number, seed?: number): void {
  if (amount <= 0) return;
  const data = imageData.data;
  const strength = amount * 255 * 0.25;
  const rng = seed != null ? mulberry32(seed) : Math.random;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const noise = (rng() - 0.5) * 2 * strength;
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

// --- Canonical pipeline order ---
// Both processFastPreview and processFullPipeline (and processFastQuantPreview)
// MUST execute these stages in this exact order so the preview is WYSIWYG with
// the export. Drift between paths is a visual bug.
//
//   1. transparency / levels / color  (per-pixel ops on source)
//   2. blur                           (Canvas filter)
//   3. resize                         (target dimensions)
//   4. sharpen                        (laplacian on resized canvas)
//   5. grain                          (deterministic when grainSeedLocked)
//   6. quantization                   (full path only — worker)
//   7. CRT                            (post-effect)
//
// If you change one path, change all three. There is no runtime test enforcing
// this — the cost of a real pixel-comparison fixture in jsdom outweighs the
// benefit. Verify visually after edits with blur=2 and brightness shifts.

// --- Source image cache (two resolutions) ---
let _cachedSrc = '';
let _cachedFull: HTMLCanvasElement | null = null;
let _cachedPreview: HTMLCanvasElement | null = null;
let _cachedHash = '';

// FNV-1a sampled over decoded pixels. Two sources that decode to the same image
// produce the same hash regardless of base64 encoder differences (e.g., a PNG
// re-saved by a different tool). Sample step 17 is coprime with 4 so all RGBA
// channels are touched and runtime stays under ~1 ms even for 1024×1024.
function computePixelHash(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return `${canvas.width}x${canvas.height}-nohash`;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < data.length; i += 17) {
    h = (h ^ data[i]) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${canvas.width}x${canvas.height}-${h.toString(16)}`;
}

export function getSourceHash(): string {
  return _cachedHash;
}

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
  _cachedHash = computePixelHash(_cachedFull);
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

// Fast preview target dim cap — keeps per-frame work bounded while dragging
// the size slider. Full pipeline still runs at user's real target after debounce.
const FAST_PREVIEW_MAX_DIM = 512;

// --- Fast preview intermediate cache ---
// Expensive pipeline stages cached per input-signature. When the user drags a
// slider that only affects stage N, stages 1..N-1 are reused.
//
// Order matches processFullPipeline so preview is WYSIWYG with the export:
//   color/levels/transparency → blur → resize → sharpen → grain → CRT
type StageCacheEntry = { key: string; canvas: HTMLCanvasElement };
const _pipelineCache: {
  sourceRef: HTMLCanvasElement | null;
  stageColor: StageCacheEntry | null;       // after transparency/levels/color
  stagePostBlur: StageCacheEntry | null;    // + blur
  stagePostResize: StageCacheEntry | null;  // + resize
  stagePostSharpen: StageCacheEntry | null; // + sharpen
} = { sourceRef: null, stageColor: null, stagePostBlur: null, stagePostResize: null, stagePostSharpen: null };

function invalidateCacheIfSourceChanged(source: HTMLCanvasElement) {
  if (_pipelineCache.sourceRef !== source) {
    _pipelineCache.sourceRef = source;
    _pipelineCache.stageColor = null;
    _pipelineCache.stagePostBlur = null;
    _pipelineCache.stagePostResize = null;
    _pipelineCache.stagePostSharpen = null;
  }
}

export interface FastPreviewOpts {
  /** True while a slider is being dragged. Skips sharpen and CRT to stay under frame budget. */
  dragActive?: boolean;
}

/** Fast preview with per-stage memoization. No quantization, no base64.
 * Order mirrors processFullPipeline so preview matches the exported result. */
export function processFastPreview(
  sourceCanvas: HTMLCanvasElement,
  settings: ConverterSettings,
  opts: FastPreviewOpts = {}
): HTMLCanvasElement {
  const { dragActive = false } = opts;
  invalidateCacheIfSourceChanged(sourceCanvas);

  let { w, h } = getTargetDimensions(sourceCanvas, settings);
  const maxSide = Math.max(w, h);
  if (maxSide > FAST_PREVIEW_MAX_DIM) {
    const scale = FAST_PREVIEW_MAX_DIM / maxSide;
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  const s = settings;

  // Stage 1: transparency + levels + color (on full source canvas, pre-resize).
  // Operates on cached source ref so this stage is rebuilt only when those settings change.
  const stageColorKey = `${s.transparencyMode}|${s.alphaThreshold}|${s.colorKeyHex}|${s.levelsInLow}|${s.levelsInHigh}|${s.levelsOutLow}|${s.levelsOutHigh}|${s.brightness}|${s.contrast}|${s.saturation}|${s.hue}|${s.gamma}|${s.tintRed}|${s.tintGreen}|${s.tintBlue}|${s.posterize}`;
  let stageColor: HTMLCanvasElement;
  if (_pipelineCache.stageColor && _pipelineCache.stageColor.key === stageColorKey) {
    stageColor = _pipelineCache.stageColor.canvas;
  } else {
    const data = canvasToImageData(sourceCanvas);
    applyTransparency(data, settings);
    applyLevels(data, settings);
    applyColorAdjustments(data, settings);
    stageColor = imageDataToCanvas(data);
    _pipelineCache.stageColor = { key: stageColorKey, canvas: stageColor };
  }

  // Stage 2: blur (post-color, pre-resize — matches full pipeline).
  const stagePostBlurKey = `${stageColorKey}|${s.blurAmount}`;
  let stagePostBlur: HTMLCanvasElement;
  if (_pipelineCache.stagePostBlur && _pipelineCache.stagePostBlur.key === stagePostBlurKey) {
    stagePostBlur = _pipelineCache.stagePostBlur.canvas;
  } else {
    stagePostBlur = applyBlur(stageColor, s.blurAmount);
    _pipelineCache.stagePostBlur = { key: stagePostBlurKey, canvas: stagePostBlur };
  }

  // Stage 3: resize.
  const stagePostResizeKey = `${stagePostBlurKey}|${w}|${h}|${s.sampleMode}`;
  let stagePostResize: HTMLCanvasElement;
  if (_pipelineCache.stagePostResize && _pipelineCache.stagePostResize.key === stagePostResizeKey) {
    stagePostResize = _pipelineCache.stagePostResize.canvas;
  } else {
    stagePostResize = resizeImage(stagePostBlur, w, h, s.sampleMode);
    _pipelineCache.stagePostResize = { key: stagePostResizeKey, canvas: stagePostResize };
  }

  // Stage 4: sharpen (skipped during active drag — O(n*4) neighbor reads).
  const effSharpen = dragActive ? 0 : s.sharpenAmount;
  const stagePostSharpenKey = `${stagePostResizeKey}|${effSharpen}`;
  let stagePostSharpen: HTMLCanvasElement;
  if (_pipelineCache.stagePostSharpen && _pipelineCache.stagePostSharpen.key === stagePostSharpenKey) {
    stagePostSharpen = _pipelineCache.stagePostSharpen.canvas;
  } else {
    stagePostSharpen = applySharpen(stagePostResize, effSharpen);
    _pipelineCache.stagePostSharpen = { key: stagePostSharpenKey, canvas: stagePostSharpen };
  }

  // Stage 5: grain. Not cached when seed unlocked (Math.random — non-deterministic).
  let stagePostGrain: HTMLCanvasElement = stagePostSharpen;
  if (s.grainAmount > 0) {
    const grainData = canvasToImageData(stagePostSharpen);
    applyGrain(grainData, s.grainAmount, s.grainSeedLocked ? s.grainSeed : undefined);
    stagePostGrain = imageDataToCanvas(grainData);
  }

  // Stage 6: CRT (skipped during active drag — extra getImageData/putImageData pass).
  if (!dragActive && s.crtEnabled) {
    try {
      return applyCRTFilter(stagePostGrain, {
        scanlineIntensity: s.crtScanlines,
        rgbShift: s.crtRgbShift,
        vignette: s.crtVignette,
      });
    } catch (err) { console.warn('Fast-preview CRT failed:', err); }
  }
  return stagePostGrain;
}

// --- Full pipeline quantization cache ---
// Post-quant effects (CRT) depend only on the quantized output. When the user
// only tweaks CRT, we skip the expensive quantize step by reusing the cached
// quantized ImageData keyed on the full upstream signature.
//
// Source identity now uses the pixel-hash from _cachedHash (computePixelHash)
// instead of the raw base64 string. Two distinct dataURLs that decode to the
// same pixels collapse to one cache slot.
type QuantCacheEntry = {
  key: string;
  quantized: ImageData;
  generatedPalette: import('@/types').PaletteColor[];
};
let _quantCache: QuantCacheEntry | null = null;

function quantSignature(sourceHash: string, s: ConverterSettings): string {
  const palette = s.palette.map((c) => `${c.r},${c.g},${c.b}`).join(';');
  return [
    `src:${sourceHash}`,
    s.sizeMode, s.width, s.height, s.sampleMode,
    s.blurAmount, s.sharpenAmount,
    s.transparencyMode, s.alphaThreshold, s.colorKeyHex,
    s.levelsInLow, s.levelsInHigh, s.levelsOutLow, s.levelsOutHigh,
    s.brightness, s.contrast, s.saturation, s.hue, s.gamma,
    s.tintRed, s.tintGreen, s.tintBlue, s.posterize, s.grainAmount,
    // Seed contributes to signature only when grain is active. When unlocked,
    // each call gets a fresh random sequence, so we tag it as uncacheable.
    s.grainAmount > 0
      ? (s.grainSeedLocked ? `seed:${s.grainSeed}` : `seed:rand:${Math.random()}`)
      : 'seed:none',
    s.colorCount, s.ditherMode, s.ditherAmount, s.distanceMetric,
    s.useKMeansPlusPlus, palette,
  ].join('|');
}

/** Full quality: everything including quantization. */
export async function processFullPipeline(
  sourceBase64: string,
  settings: ConverterSettings
): Promise<{ resultCanvas: HTMLCanvasElement; generatedPalette: import('@/types').PaletteColor[] }> {
  const sourceCanvas = await getCachedSource(sourceBase64);

  const sig = quantSignature(_cachedHash, settings);
  const cacheHit = _quantCache?.key === sig;

  let quantized: ImageData;
  let generatedPalette: import('@/types').PaletteColor[];

  if (cacheHit && _quantCache) {
    quantized = _quantCache.quantized;
    generatedPalette = _quantCache.generatedPalette;
  } else {
    const { quantize, setLastPalette } = await import('./quantizationClient');

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

    // Grain (pre-quantize for consistent output)
    const preQuantData = canvasToImageData(current);
    applyGrain(preQuantData, settings.grainAmount, settings.grainSeedLocked ? settings.grainSeed : undefined);
    current = imageDataToCanvas(preQuantData);

    // Quantization — offloaded to Web Worker; buffer is transferred.
    const quantData = canvasToImageData(current);
    const out = await quantize(quantData, settings, { priority: 'full' });
    quantized = out.imageData;
    generatedPalette = out.generatedPalette;

    _quantCache = { key: sig, quantized, generatedPalette };

    // Seed tier-2 fast preview with this palette for the next drag.
    setLastPalette(sourceBase64, generatedPalette);
  }

  let resultCanvas = imageDataToCanvas(quantized);

  // CRT effect — post-quant, not cached
  if (settings.crtEnabled) {
    try {
      resultCanvas = applyCRTFilter(resultCanvas, {
        scanlineIntensity: settings.crtScanlines,
        rgbShift: settings.crtRgbShift,
        vignette: settings.crtVignette,
      });
    } catch (err) { console.warn('CRT filter failed, skipping:', err); }
  }

  return { resultCanvas, generatedPalette };
}

// --- Tier 2: fast-quant preview ---
// Runs the full pipeline at a smaller resolution via the worker, reusing the
// last generated palette so the costly Wu/RGBQuant sample step is skipped.
// Async, superseded by newer calls via latest-wins in quantizationClient.
const FAST_QUANT_MAX_DIM = 256;

export async function processFastQuantPreview(
  sourceCanvas: HTMLCanvasElement,
  settings: ConverterSettings,
  sourceKey: string
): Promise<HTMLCanvasElement | null> {
  try {
    const { quantize, getLastPalette } = await import('./quantizationClient');

    let { w, h } = getTargetDimensions(sourceCanvas, settings);
    const maxSide = Math.max(w, h);
    if (maxSide > FAST_QUANT_MAX_DIM) {
      const scale = FAST_QUANT_MAX_DIM / maxSide;
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }

    // Order matches processFullPipeline (color → blur → resize → sharpen → grain).
    // No cache: this path is async + latest-wins, O(pixels) at 256 is cheap enough.
    const colorData = canvasToImageData(sourceCanvas);
    applyTransparency(colorData, settings);
    applyLevels(colorData, settings);
    applyColorAdjustments(colorData, settings);
    let c = imageDataToCanvas(colorData);

    c = applyBlur(c, settings.blurAmount);
    c = resizeImage(c, w, h, settings.sampleMode);
    c = applySharpen(c, settings.sharpenAmount);

    // Grain post-sharpen, pre-quant.
    if (settings.grainAmount > 0) {
      const grainData = canvasToImageData(c);
      applyGrain(grainData, settings.grainAmount, settings.grainSeedLocked ? settings.grainSeed : undefined);
      c = imageDataToCanvas(grainData);
    }

    // Only freeze palette in generated mode. Custom palette is already fast.
    const frozenPalette = settings.palette.length === 0
      ? getLastPalette(sourceKey) ?? undefined
      : undefined;

    const quantData = canvasToImageData(c);
    const { imageData: quantized } = await quantize(quantData, settings, {
      priority: 'fast',
      frozenPalette,
    });

    let result = imageDataToCanvas(quantized);

    if (settings.crtEnabled) {
      try {
        result = applyCRTFilter(result, {
          scanlineIntensity: settings.crtScanlines,
          rgbShift: settings.crtRgbShift,
          vignette: settings.crtVignette,
        });
      } catch (err) { console.warn('Tier-2 CRT failed:', err); }
    }

    return result;
  } catch (err) {
    // Stale responses reject with 'stale' — not a real error, just drop.
    if (err instanceof Error && err.message === 'stale') return null;
    console.error('Fast-quant preview error:', err);
    return null;
  }
}
