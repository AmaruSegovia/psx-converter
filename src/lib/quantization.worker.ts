import quantizeImage from './quantization';
import type { ConverterSettings, PaletteColor } from '@/types';

interface WorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  settings: ConverterSettings;
  frozenPalette?: PaletteColor[];
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, buffer, width, height, settings, frozenPalette } = e.data;
  try {
    const data = new Uint8ClampedArray(buffer);
    const img = new ImageData(data, width, height);
    const { imageData, generatedPalette } = await quantizeImage(img, settings, { frozenPalette });
    const outBuf = imageData.data.buffer;
    self.postMessage(
      {
        id,
        buffer: outBuf,
        width: imageData.width,
        height: imageData.height,
        generatedPalette,
      },
      { transfer: [outBuf] }
    );
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message || String(err) });
  }
};

export {};
