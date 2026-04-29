import type { ExampleImage } from '@/types';

export const EXAMPLE_IMAGES: ExampleImage[] = [
  {
    id: 'ejemplo1',
    name: 'Ejemplo 1',
    filename: 'Ejemplo1.jpg',
    suggestedSettings: {
      width: 64,
      height: 64,
      sizeMode: 'absolute',
      ditherMode: 'none',
      colorCount: 16,
      posterize: 0,
    },
  },
  {
    id: 'ejemplo2',
    name: 'Ejemplo 2',
    filename: 'Ejemplo2.jfif',
    suggestedSettings: {
      width: 128,
      height: 128,
      sizeMode: 'absolute',
      ditherMode: 'floyd-steinberg',
      ditherAmount: 0.4,
      colorCount: 24,
      posterize: 0,
    },
  },
  {
    id: 'ejemplo3',
    name: 'Ejemplo 3',
    filename: 'Ejemplo3.jfif',
    suggestedSettings: {
      width: 64,
      height: 64,
      sizeMode: 'absolute',
      ditherMode: 'bayer-4x4',
      ditherAmount: 0.8,
      colorCount: 16,
    },
  },
  {
    id: 'ejemplo4',
    name: 'Ejemplo 4',
    filename: 'Ejemplo4.jpeg',
    suggestedSettings: {
      width: 64,
      height: 64,
      sizeMode: 'absolute',
      ditherMode: 'jarvis',
      ditherAmount: 0.3,
      colorCount: 8,
      posterize: 4,
    },
  },
];
