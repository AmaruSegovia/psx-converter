declare module 'upng-js' {
  /**
   * Encode RGBA frames into PNG. `cnum` controls palette size:
   *   - 0 → lossless (PNG-24/32, no quantization)
   *   - 1..256 → indexed PNG-8 with `cnum` palette entries
   * Returns the PNG bytes as ArrayBuffer.
   */
  export function encode(
    rgbaBuffers: ArrayBuffer[],
    width: number,
    height: number,
    cnum?: number,
    delays?: number[]
  ): ArrayBuffer;

  const UPNG: { encode: typeof encode };
  export default UPNG;
}
