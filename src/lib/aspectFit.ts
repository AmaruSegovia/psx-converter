/**
 * Aspect-aware sizing helpers used during image swap and preset load.
 *
 * Mental model: when the user has `lockAspect: true`, the largest of
 * (width, height) is the **target long side**. The other dimension is derived
 * from the new source's aspect ratio so the output always matches the source
 * shape. When `lockAspect: false`, both dimensions are user-specified and
 * preserved literally (only clamped to source if they would exceed it).
 */

export interface AspectFitInput {
  /** Current width setting. */
  width: number;
  /** Current height setting. */
  height: number;
  /** True if the current aspect should drive the new short side. */
  lockAspect: boolean;
  /** Width of the freshly loaded source image (px). */
  sourceWidth: number;
  /** Height of the freshly loaded source image (px). */
  sourceHeight: number;
}

export interface AspectFitOutput {
  width: number;
  height: number;
}

/**
 * Compute new dims for a freshly loaded image, given current settings.
 * Used by the dropzone replace flow.
 */
export function fitDimsToSource(input: AspectFitInput): AspectFitOutput {
  const { width, height, lockAspect, sourceWidth, sourceHeight } = input;
  if (sourceWidth <= 0 || sourceHeight <= 0) return { width, height };

  if (lockAspect) {
    const longSide = Math.max(width, height);
    const aspect = sourceWidth / sourceHeight;
    return aspect >= 1
      ? { width: Math.min(longSide, sourceWidth), height: Math.max(1, Math.round(Math.min(longSide, sourceWidth) / aspect)) }
      : { height: Math.min(longSide, sourceHeight), width: Math.max(1, Math.round(Math.min(longSide, sourceHeight) * aspect)) };
  }

  // Lock off: keep user dims, clamp to source so we never upsample by accident.
  return {
    width: Math.min(width, sourceWidth),
    height: Math.min(height, sourceHeight),
  };
}
