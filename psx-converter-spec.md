# PSX Texture Converter — Especificación Técnica Completa

## Descripción General

Aplicación web de procesamiento de imágenes para convertir cualquier imagen al estilo visual
de texturas de PlayStation 1 (PSX). Inspirada en SLK_img2pixel pero con interfaz moderna,
preview en tiempo real, integración con Lospec API y sistema de presets guardables.

Todo el procesamiento ocurre en el browser (client-side). No hay backend ni server.

---

## Stack Técnico

| Herramienta | Versión | Rol |
|---|---|---|
| Vite + React | Latest | Framework base (NO Next.js — no se necesita SSR) |
| TypeScript | Latest | Tipado estático |
| Tailwind CSS | v3 | Estilos |
| shadcn/ui | Latest | Componentes UI (Slider, Select, Dialog, Tabs, etc.) |
| Framer Motion | Latest | Animaciones de UI (NO usar en procesamiento de imagen) |
| Zustand | Latest | Estado global + persistencia de presets |
| zustand/middleware persist | Built-in | Guardar presets en localStorage automáticamente |
| image-q | Latest | Cuantización de paleta y dithering (núcleo del procesamiento) |
| Canvas API | Nativa browser | Resize Nearest Neighbor, ajustes de color, preview |
| Lospec API | REST público | Importar paletas por nombre/slug |

### Por qué estas herramientas y no otras

- **Vite sobre Next.js**: Es una herramienta local, no necesita SSR, routing complejo ni server components.
- **image-q sobre quantize.js o RgbQuant.js**: Es TypeScript nativo, tiene múltiples algoritmos (RGBQuant, NeuQuant, WuQuant, k-means++), múltiples modos de dithering (Floyd-Steinberg, Jarvis, Bayer, etc.) y múltiples métricas de distancia de color (Euclidean, Manhattan, CIEDE2000). Las alternativas están abandonadas o tienen menos features.
- **Zustand sobre Redux/Jotai**: Para esta escala de app es el punto medio perfecto. Jotai sería overkill para estado centralizado, Redux tiene demasiado boilerplate.
- **shadcn/ui**: El código queda en el proyecto (no es dependencia externa). Los componentes Slider son perfectos para los controles de la app.
- **Canvas API nativa**: Para resize, brillo, contraste, saturación, hue, gamma y tint no se necesita ninguna librería — Canvas lo hace todo. image-q solo entra para la cuantización de paleta.

---

## Arquitectura del Proyecto

```
src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx           # Layout principal
│   │   └── Sidebar.tsx            # Panel de controles izquierdo
│   ├── controls/
│   │   ├── TabSample.tsx          # Tab: resize, blur, sharpen
│   │   ├── TabDither.tsx          # Tab: dithering mode, distance metric, amount
│   │   ├── TabPalette.tsx         # Tab: paleta, colores, generate, Lospec
│   │   └── TabColors.tsx          # Tab: brightness, contrast, saturation, hue, gamma, tint
│   ├── preview/
│   │   ├── ImageDropzone.tsx      # Drag & drop de imagen
│   │   ├── PreviewCanvas.tsx      # Canvas de preview resultado
│   │   └── BeforeAfterSlider.tsx  # Slider visual de comparación
│   └── presets/
│       ├── PresetManager.tsx      # Dialog de gestión de presets
│       └── PresetCard.tsx         # Card individual de preset con thumbnail
├── hooks/
│   ├── useImageProcessor.ts       # Hook principal de procesamiento
│   ├── useDebounce.ts             # Debounce para preview en tiempo real
│   └── useLospecAPI.ts            # Hook para fetching de paletas de Lospec
├── lib/
│   ├── imageProcessing.ts         # Lógica de Canvas: resize, ajustes de color
│   ├── quantization.ts            # Wrapper de image-q: cuantización y dithering
│   ├── paletteParser.ts           # Parser de formatos .hex, .pal, .gpl
│   └── utils.ts                   # Helpers generales
├── store/
│   └── converterStore.ts          # Zustand store con persist
├── types/
│   └── index.ts                   # Tipos TypeScript globales
└── data/
    └── builtinPalettes.ts         # Paletas PSX hardcodeadas como fallback
```

---

## Tipos TypeScript

```typescript
// types/index.ts

export interface ConverterSettings {
  // Tab Sample
  width: number;
  height: number;
  sizeMode: 'absolute' | 'relative'; // Absolute = px exactos, Relative = % del original
  sampleMode: 'nearest' | 'bilinear' | 'bicubic';
  sampleOffsetX: number;
  sampleOffsetY: number;
  blurAmount: number;      // 0.0 - 5.0
  sharpenAmount: number;   // 0.0 - 5.0

  // Tab Dither
  alphaThreshold: number;  // 0 - 255
  distanceMetric: 'euclidean' | 'manhattan' | 'ciede2000' | 'rgb-redmean';
  ditherMode: 'none' | 'floyd-steinberg' | 'jarvis' | 'bayer-2x2' | 'bayer-4x4' | 'bayer-8x8';
  ditherAmount: number;    // 0.0 - 1.0

  // Tab Palette
  colorCount: number;      // 4, 8, 16, 32, 64
  useKMeansPlusPlus: boolean;
  palette: PaletteColor[]; // Colores actuales de la paleta
  paletteSource: 'generated' | 'lospec' | 'builtin' | 'custom';
  lospecSlug: string;      // ej: "psx-horror", "sweetie-16"

  // Tab Colors
  brightness: number;      // -1.0 a 1.0 (0 = sin cambio)
  contrast: number;        // 0.0 a 3.0 (1.0 = sin cambio)
  saturation: number;      // 0.0 a 3.0 (1.0 = sin cambio)
  hue: number;             // -180 a 180 (0 = sin cambio)
  gamma: number;           // 0.1 a 3.0 (1.0 = sin cambio)
  tintRed: number;         // 0 - 255
  tintGreen: number;       // 0 - 255
  tintBlue: number;        // 0 - 255
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
  thumbnail?: string;       // Base64 del resultado procesado como preview
  createdAt: number;        // timestamp
}

export interface LospecPaletteResponse {
  name: string;
  author: string;
  colors: string[];         // Array de hex strings sin "#": ["ff0000", "00ff00"]
}
```

---

## Zustand Store

```typescript
// store/converterStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConverterStore {
  // Estado actual
  settings: ConverterSettings;
  sourceImage: string | null;      // Base64 de la imagen original
  resultImage: string | null;      // Base64 del resultado procesado
  isProcessing: boolean;
  activeTab: 'sample' | 'dither' | 'palette' | 'colors';

  // Presets guardados
  presets: Preset[];

  // Acciones
  updateSettings: (partial: Partial<ConverterSettings>) => void;
  setSourceImage: (base64: string) => void;
  setResultImage: (base64: string) => void;
  setIsProcessing: (v: boolean) => void;
  setActiveTab: (tab: string) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  resetSettings: () => void;
}

// Usar persist para guardar presets y settings en localStorage
```

---

## Pipeline de Procesamiento de Imagen

El orden de operaciones es crítico. Siempre en este orden:

```
1. Imagen original (cargada por el usuario)
        ↓
2. Ajustes de color PRE-resize (Tab Colors)
   - Brightness via Canvas pixel manipulation
   - Contrast via Canvas pixel manipulation
   - Saturation via Canvas pixel manipulation
   - Hue via Canvas pixel manipulation
   - Gamma via Canvas pixel manipulation
   - Tint RGB via Canvas pixel manipulation
        ↓
3. Blur (si blurAmount > 0) — CSS filter o Gaussian manual
        ↓
4. Resize (Tab Sample)
   - Nearest Neighbor siempre para PSX auténtico
   - Respetar sampleMode seleccionado
   - Aplicar offsets X/Y si los hay
        ↓
5. Sharpen (si sharpenAmount > 0)
        ↓
6. Cuantización de paleta (image-q)
   - Usar algoritmo seleccionado (RGBQuant, NeuQuant, k-means++)
   - Aplicar métrica de distancia seleccionada
   - Aplicar dithering con intensidad seleccionada
        ↓
7. Resultado final → Canvas de preview → PNG exportable
```

### Implementación del procesamiento con Canvas

```typescript
// lib/imageProcessing.ts

export function applyColorAdjustments(
  imageData: ImageData,
  settings: Pick<ConverterSettings, 
    'brightness' | 'contrast' | 'saturation' | 
    'hue' | 'gamma' | 'tintRed' | 'tintGreen' | 'tintBlue'>
): ImageData {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    
    // Aplicar cada ajuste en orden
    // brightness, contrast, saturation, hue, gamma, tint
    // ... implementación pixel por pixel
    
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
  return imageData;
}

export function resizeImage(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  mode: 'nearest' | 'bilinear'
): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const ctx = output.getContext('2d')!;
  
  // Nearest Neighbor — desactivar interpolación del browser
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, width, height);
  
  return output;
}
```

### Integración con image-q

```typescript
// lib/quantization.ts
import * as iq from 'image-q';

export async function quantizeImage(
  imageData: ImageData,
  settings: Pick<ConverterSettings, 
    'colorCount' | 'ditherMode' | 'ditherAmount' | 
    'distanceMetric' | 'palette' | 'useKMeansPlusPlus'>
): Promise<ImageData> {
  
  // 1. Crear PointContainer desde ImageData
  const pointContainer = iq.utils.PointContainer.fromUint8Array(
    imageData.data, imageData.width, imageData.height
  );

  // 2. Seleccionar distance calculator
  const distanceCalculator = getDistanceCalculator(settings.distanceMetric);

  // 3. Seleccionar y configurar palette quantizer
  const paletteQuantizer = settings.useKMeansPlusPlus
    ? new iq.palette.WuQuant(distanceCalculator, settings.colorCount)
    : new iq.palette.RGBQuant(distanceCalculator, settings.colorCount);

  // 4. Si hay paleta custom, usarla directamente
  // Si no, generarla desde la imagen
  paletteQuantizer.sample(pointContainer);
  const palette = paletteQuantizer.quantizeSync();

  // 5. Seleccionar dithering
  const imageQuantizer = getDitherer(settings.ditherMode, distanceCalculator, settings.ditherAmount);

  // 6. Aplicar paleta a la imagen
  const result = imageQuantizer.quantizeSync(pointContainer, palette);

  // 7. Convertir resultado a ImageData
  return new ImageData(result.toUint8Array(), imageData.width, imageData.height);
}

function getDistanceCalculator(metric: string) {
  switch(metric) {
    case 'euclidean': return new iq.distance.Euclidean();
    case 'manhattan': return new iq.distance.Manhattan();
    case 'ciede2000': return new iq.distance.CIEDE2000();
    case 'rgb-redmean': return new iq.distance.EuclideanRGBQuantWOAlpha();
    default: return new iq.distance.Euclidean();
  }
}

function getDitherer(mode: string, distance: any, amount: number) {
  switch(mode) {
    case 'floyd-steinberg':
      return new iq.image.ErrorDiffusionArray(distance, iq.image.ErrorDiffusionArrayKernel.FloydSteinberg);
    case 'jarvis':
      return new iq.image.ErrorDiffusionArray(distance, iq.image.ErrorDiffusionArrayKernel.Jarvis);
    case 'bayer-4x4':
      return new iq.image.OrderedDither(distance, iq.image.OrderedDitherMatrix.Bayer4x4);
    case 'none':
    default:
      return new iq.image.NearestColor(distance);
  }
}
```

---

## Lospec API Integration

```typescript
// hooks/useLospecAPI.ts

const LOSPEC_API = 'https://lospec.com/palette-list';

export async function fetchLospecPalette(slug: string): Promise<PaletteColor[]> {
  // IMPORTANTE: Lospec tiene CORS — usar un proxy o fetch directo
  // URL: https://lospec.com/palette-list/[slug].json
  
  const response = await fetch(`${LOSPEC_API}/${slug}.json`);
  
  if (!response.ok) throw new Error('Paleta no encontrada');
  
  const data: LospecPaletteResponse = await response.json();
  
  // Convertir array de hex strings a PaletteColor[]
  return data.colors.map(hex => ({
    hex: `#${hex}`,
    r: parseInt(hex.slice(0,2), 16),
    g: parseInt(hex.slice(2,4), 16),
    b: parseInt(hex.slice(4,6), 16),
  }));
}

// NOTA IMPORTANTE: Lospec puede tener restricciones CORS en producción.
// Si hay problemas, usar un proxy CORS o hacer un pequeño servidor
// intermedio con Cloudflare Workers o similar.
```

---

## Paletas PSX Builtin

Incluir estas paletas hardcodeadas como fallback (no dependen de internet):

```typescript
// data/builtinPalettes.ts

export const BUILTIN_PALETTES = [
  {
    name: 'PSX Horror (16)',
    slug: 'psx-horror',
    description: 'Estilo Silent Hill / Resident Evil',
    colors: [
      '#0a0a0a', '#1c1410', '#2d1f14', '#3d2b1a',
      '#4e3720', '#5f4226', '#704e2d', '#816034',
      '#927b4d', '#a39566', '#b4af80', '#c5c89a',
      '#d6e2b4', '#e7fbce', '#8b7355', '#6b5a42',
    ]
  },
  {
    name: 'PSX RPG (16)',
    slug: 'psx-rpg',
    description: 'Estilo Final Fantasy VII / Chrono Cross',
    colors: [/* ... */]
  },
  {
    name: 'PSX Minimal (8)',
    slug: 'psx-minimal',
    description: '8 colores ultra limitados',
    colors: [/* ... */]
  },
];
```

---

## Componentes UI Principales

### Layout General

```
┌─────────────────────────────────────────────────────────┐
│  [Load] [Save]   PSX Converter              [Export PNG] │
├──────────────────┬──────────────────────────────────────┤
│                  │                                        │
│  [Sample]        │         BEFORE    │    AFTER           │
│  [Dither]        │                   ↕                    │
│  [Palette]       │     (before/after drag slider)         │
│  [Colors]        │                                        │
│                  │                                        │
│  ─────────────   │                                        │
│  Controles del   │                                        │
│  tab activo      │                                        │
│                  │                                        │
└──────────────────┴──────────────────────────────────────┘
```

### Tab Sample — Controles

```
[● Absolute] [○ Relative]

Width    [──────────────●──] 128
Height   [──────────────●──] 128

Sample Mode  [Nearest ▼]

Sample X offset  [───●────────────] 0.00
Sample Y offset  [───●────────────] 0.00

Blur amount      [───●────────────] 0.00
Sharpen amount   [───●────────────] 0.00
```

### Tab Dither — Controles

```
Alpha threshold  [──────────●─────] 128

Distance metric  [RGB Redmean ▼]

Dither mode      [Floyd-Steinberg ▼]
  Opciones: None, Floyd-Steinberg, Jarvis, 
            Bayer 2x2, Bayer 4x4, Bayer 8x8

Dither amount    [──●─────────────] 0.20
```

### Tab Palette — Controles

```
[■][■][■][■][■][■][■][■]  ← swatches clickeables
[■][■][■][■][■][■][■][■]

Color seleccionado:
  Red    [──────────────●──] 128
  Green  [──────────────●──] 64
  Blue   [──────────────●──] 32

Color count  [────────●───────] 16

[Generate palette]
[✓] k-means++

─────────────────────────
Importar desde Lospec:
[slug de paleta...    ] [Import]

Paletas builtin:
[PSX Horror ▼]
```

### Tab Colors — Controles

```
Brightness  [──────────●──────] 0.00
Contrast    [──────────●──────] 1.00
Saturation  [──────────●──────] 1.00
Hue         [──────────●──────] 0
Gamma       [──────────●──────] 1.00

─────────────────────────
Tint red    [──────────────●──] 255
Tint green  [──────────────●──] 255
Tint blue   [──────────────●──] 255
```

---

## Sistema de Presets

### Estructura JSON de un preset guardado

```json
{
  "id": "uuid-generado",
  "name": "PSX Horror oscuro",
  "createdAt": 1710000000000,
  "thumbnail": "data:image/png;base64,...",
  "settings": {
    "width": 128,
    "height": 128,
    "sizeMode": "absolute",
    "sampleMode": "nearest",
    "sampleOffsetX": 0,
    "sampleOffsetY": 0,
    "blurAmount": 0.5,
    "sharpenAmount": 0,
    "alphaThreshold": 128,
    "distanceMetric": "rgb-redmean",
    "ditherMode": "floyd-steinberg",
    "ditherAmount": 0.2,
    "colorCount": 16,
    "useKMeansPlusPlus": false,
    "palette": [],
    "paletteSource": "builtin",
    "lospecSlug": "",
    "brightness": -0.1,
    "contrast": 1.2,
    "saturation": 0.6,
    "hue": 0,
    "gamma": 1.0,
    "tintRed": 255,
    "tintGreen": 240,
    "tintBlue": 220
  }
}
```

### UI del gestor de presets

- Click en **Save** → Dialog para nombrar el preset → se guarda con thumbnail del resultado actual
- Click en **Load** → Grid de cards con nombre, thumbnail y fecha → click para aplicar
- Cada card tiene botón de eliminar

---

## Preview en Tiempo Real

El preview tiene que ser rápido pero no bloquear la UI:

```typescript
// hooks/useImageProcessor.ts

export function useImageProcessor() {
  const settings = useConverterStore(s => s.settings);
  const sourceImage = useConverterStore(s => s.sourceImage);
  
  // Debounce de 300ms para no procesar en cada keystroke del slider
  const debouncedSettings = useDebounce(settings, 300);
  
  useEffect(() => {
    if (!sourceImage) return;
    
    // Procesar en un Worker para no bloquear la UI principal
    // O simplemente async con requestAnimationFrame
    processImage(sourceImage, debouncedSettings).then(result => {
      useConverterStore.getState().setResultImage(result);
    });
  }, [debouncedSettings, sourceImage]);
}
```

---

## BeforeAfter Slider

Componente de comparación visual drag-and-drop:

```tsx
// components/preview/BeforeAfterSlider.tsx

// Renderiza dos canvas superpuestos
// El slider divide verticalmente cuánto se ve de cada uno
// Usa Framer Motion para la animación del drag
// Al arrastrar el divisor, clip-path del canvas "after" cambia en tiempo real
```

---

## Export PNG

```typescript
export function exportPNG(canvasEl: HTMLCanvasElement, filename = 'psx-texture.png') {
  canvasEl.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
```

---

## Valores por Defecto (PSX Horror como default)

```typescript
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
};
```

---

## Consideraciones Importantes

### Performance

- El procesamiento de imágenes grandes puede ser lento en el browser.
- Si la imagen tiene más de 1024x1024px, reducirla a max 1024px antes de procesar en el step 2.
- Usar `requestAnimationFrame` o `setTimeout(0)` para no bloquear la UI durante el procesamiento.
- Considerar `OffscreenCanvas` + `Web Worker` para el procesamiento pesado si hay lag notorio.

### Lospec CORS

- La API de Lospec puede tener restricciones CORS según el ambiente.
- En desarrollo local generalmente funciona.
- En producción si hay problemas, usar un proxy con Cloudflare Workers o un endpoint serverless mínimo.
- Alternativa: incluir un set de paletas populares de PSX hardcodeadas como fallback.

### image-q y dither amount

- image-q no tiene un parámetro nativo de "dither amount".
- Para simular este control, mezclar el resultado dithereado con el resultado sin dither usando `globalAlpha` en Canvas, o interpolar pixel a pixel.
- Esto da el efecto de intensity que tiene SLK_img2pixel.

### k-means++ en image-q

- El algoritmo WuQuant de image-q es conceptualmente similar a k-means++.
- Al activar el toggle k-means++, usar `iq.palette.WuQuant` en lugar de `iq.palette.RGBQuant`.

---

## Dependencias a Instalar

```bash
# Core
npm create vite@latest psx-converter -- --template react-ts

# Estilos y UI
npm install tailwindcss postcss autoprefixer
npm install @shadcn/ui  # luego: npx shadcn-ui@latest init
npx shadcn-ui@latest add slider select tabs dialog button card badge

# Animaciones
npm install framer-motion

# Estado
npm install zustand

# Procesamiento de imagen
npm install image-q

# Utilidades
npm install uuid  # para generar IDs de presets
```

---

## Mejoras sobre SLK_img2pixel (diferenciadores)

| Feature | SLK_img2pixel | Esta app |
|---|---|---|
| Preview | Click para procesar | Tiempo real con debounce 300ms |
| Paletas | Importar archivo .pal manual | Lospec API + builtin PSX |
| Presets | Load/Save de archivo | localStorage con thumbnails |
| Before/After | No tiene | Slider visual interactivo |
| Interfaz | Gris retro | Moderna con Tailwind + shadcn |
| Plataforma | Windows .exe | Web browser, sin instalación |
| Thumbnails en presets | No | Sí, muestra resultado previo |

---

## Notas Finales para la IA que implemente esto

1. **Empezar por el pipeline de procesamiento** (`lib/imageProcessing.ts` y `lib/quantization.ts`) — sin esto la app no funciona.
2. **Luego el store de Zustand** con los tipos correctos.
3. **Luego el ImageDropzone** y el PreviewCanvas básico sin animaciones.
4. **Luego los tabs de controles** uno por uno, conectados al store.
5. **Por último** las animaciones con Framer Motion, el BeforeAfter slider y el sistema de presets.
6. **No usar librerías de procesamiento de imagen extra** como sharp, jimp o pica — Canvas API es suficiente para todo excepto la cuantización de paleta.
7. **El orden del pipeline de procesamiento es crítico** — aplicar colores ANTES del resize, cuantización SIEMPRE al final.
8. **Para el dither amount**, implementar una función que interpole entre la imagen cuantizada con dithering y sin dithering según el valor del slider (0 = sin dither, 1 = dither completo).
