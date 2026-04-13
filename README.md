# PSX Texture Converter

Una herramienta en el navegador para convertir imágenes en **texturas pixel art estilo PlayStation 1** — completamente del lado del cliente, sin subidas, sin backend.

## Tecnologías

| Librería | Rol |
|---|---|
| React 19 + TypeScript | Framework de UI |
| Vite 8 | Bundler |
| Tailwind CSS 4 | Estilos |
| Zustand 5 | Estado global (con persistencia en localStorage) |
| image-q | Cuantización de paleta (K-Means++, Wu, Floyd-Steinberg, Jarvis) |
| react-colorful | Selector de color HSL |
| Framer Motion | Animaciones |
| sonner | Notificaciones toast |
| Base UI | Primitivos headless (Slider, Select, Dialog, Tabs) |
| shadcn/ui | Componentes Button, ScrollArea, Separator |

## Cómo ejecutarlo

### Requisitos previos

- [Node.js](https://nodejs.org/) 18 o superior
- npm (viene incluido con Node.js)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/psx-converter.git
cd psx-converter

# Instalar dependencias
npm install
```

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

### Build de producción

```bash
npm run build
```

El resultado va a `dist/`. Podés servirlo con cualquier servidor de archivos estáticos:

```bash
npm run preview  # previsualizar el build de producción localmente
```

## Cómo usarlo

1. **Cargar una imagen** — arrastrá y soltá sobre el canvas, o hacé click en la zona de carga
2. **Redimensionar** — configurá las dimensiones objetivo en el tab Resize (las texturas PSX suelen ser potencias de 2: 32, 64, 128, 256)
3. **Ajustar dithering** — elegí un modo de dithering y la cantidad en el tab Dither
4. **Elegir paleta** — usá cuantización K-Means o Wu, o importá una paleta desde [Lospec](https://lospec.com/palette-list)
5. **Corrección de color** — ajustá brillo, contraste, saturación, hue en el tab Colors; activá el filtro CRT para mayor autenticidad
6. **Exportar** — hacé click en "Export PNG" o presioná Ctrl+S; usá Exportar en lote para múltiples tamaños a la vez

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Rehacer |
| `Ctrl+S` | Exportar PNG |
| `Ctrl+C` | Copiar al portapapeles |
| `?` | Mostrar atajos |

## Importar paletas de Lospec

En el tab Palette, pegá cualquiera de estos formatos:
- URL completa: `https://lospec.com/palette-list/pico-8`
- Solo el slug: `pico-8`

La app obtiene la paleta vía la API de Lospec y la aplica de inmediato.

## Estructura del proyecto

```
src/
├── components/
│   ├── controls/        # TabSample, TabDither, TabPalette, TabColors
│   ├── layout/          # AppShell (layout principal), Sidebar
│   ├── preview/         # PreviewCanvas, BeforeAfterSlider, ImageDropzone
│   ├── presets/         # PresetManager, PresetCard
│   └── ui/              # Button, Slider, Dialog, InfoTip, etc.
├── hooks/
│   ├── useImageProcessor.ts   # rAF para preview rápido + pipeline completo con debounce
│   ├── useUndoRedo.ts         # Historial con línea de tiempo visual
│   ├── useTranslation.ts      # Hook reactivo de i18n
│   └── useLospecAPI.ts        # Obtención de paletas desde Lospec
├── lib/
│   ├── canvasBus.ts           # Pub/sub singleton que bypasea React para actualizar el canvas
│   ├── imageProcessing.ts     # Pipeline de procesamiento completo + caché de fuente
│   ├── quantization.ts        # Wrapper de image-q
│   ├── crtFilter.ts           # Efecto CRT post-procesamiento (Canvas 2D)
│   ├── i18n.ts                # Traducciones EN/ES (~115 claves)
│   └── paletteParser.ts       # Parseo de archivos de paleta (GPL, HEX, etc.)
├── store/
│   └── converterStore.ts      # Store Zustand con persistencia throttled en localStorage
└── types/
    └── index.ts               # Tipos TypeScript compartidos
```

## Licencia

MIT
