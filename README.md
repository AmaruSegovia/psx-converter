# PSX Texture Converter

Convertí cualquier imagen en una **textura pixel art estilo PlayStation 1** directamente en el navegador. Dithering, cuantización de paleta, efecto CRT, grano de película, niveles, presets y exportación — todo en tiempo real, sin subir nada a ningún servidor.

**→ Probalo online: [amarusegovia.github.io/psx-converter](https://amarusegovia.github.io/psx-converter/)**

No hace falta instalar nada. Tu imagen nunca sale de tu navegador.

---

## Qué es

Una herramienta para darle a tus imágenes el look de las texturas de PS1, N64, GameBoy o arcades viejos. Útil para:

- Texturas de juegos retro / PSX-style
- Pixel art a partir de fotos o ilustraciones
- Avatares, iconos, sprites
- Exploraciones estéticas de pixel art con distintos tamaños, paletas y dithering
- Material para shaders lo-fi o mods de estética vintage

100% del lado del cliente. No hay backend, no hay uploads, no hay analíticas. Podés usarla offline después de la primera carga.

---

## Qué podés hacer

### Resize / Sample
Definí el tamaño objetivo en píxeles absolutos o en porcentaje del original. Elegí entre *nearest*, *bilinear* o *bicubic* para controlar qué tan crudo o suave queda el downscale. Blur y sharpen previos para ajustar el detalle antes del pixelado.

### Dither
- **Floyd–Steinberg**, **Jarvis** y **Bayer 2×2 / 4×4 / 8×8** reales
- Slider de intensidad
- Métrica de distancia configurable (Euclidean, Manhattan, CIEDE2000, RGB redmean)
- Transparencia: por umbral de alpha o color clave

### Paleta
- Cuantización automática con **K-Means++** o **Wu**
- Hasta 256 colores, o tan pocos como 2
- **Importá desde [Lospec](https://lospec.com/palette-list)** — pegá el slug (`pico-8`) o la URL completa
- Paletas built-in (GameBoy, Sweetie 16, y más)
- Editor de paleta custom con selector HSL, eyedropper (cuando el navegador lo soporta) y entrada por hex
- **Exportá tu paleta** a `.hex`, `.gpl` (GIMP) o `.json`

### Colores
Brillo, contraste, saturación, hue, gamma, tint RGB, **posterizar** y **niveles** completos (rangos de entrada/salida tipo Photoshop).

### Efectos
- **CRT**: scanlines, desplazamiento RGB, vignette
- **Grano de película**: ruido luminance configurable

### Preview
- Canvas con zoom (rueda del mouse) y pan
- **Modo comparar**: slider antes/después arrastrable
- Grilla de píxeles opcional cuando hacés zoom
- Todo se actualiza en tiempo real mientras movés los sliders

### Exportar
- **PNG** con nombre inteligente (`imagen_128x128_psx.png`)
- **Copiar al portapapeles** (Ctrl+C) para pegar directo en otra app
- **Batch export a ZIP**: generás múltiples tamaños (32, 64, 128, 256…) en un solo click y bajás un `.zip` con todos

### Historial
Cada cambio queda registrado en una línea de tiempo visual en el sidebar. Deshacer, rehacer, o saltar directo a cualquier punto haciendo click en la línea. El historial persiste durante la sesión (sobrevive a refresh).

---

## Presets incluidos

8 presets que se adaptan automáticamente al aspecto y tamaño de tu imagen. Cuando los cargás, ves un preview real con tu propia imagen antes de aplicarlos.

| Preset | Estilo |
|---|---|
| **PSX Classic** | 128px · 16 colores · dithering suave · look PSX auténtico |
| **PSX Horror** | Niebla Silent Hill · desaturado + grano + CRT |
| **GameBoy** | 4 colores verdes · 160×144 nativo |
| **N64 Bilinear** | Filtrado borroso clásico de N64 · 32 colores |
| **Arcade CRT** | Colores saturados + scanlines pesadas |
| **Sweetie 16** | Paleta curada de pixel art de 16 colores |
| **2-bit Minimal** | 4 colores blanco/negro · Bayer dither pesado |
| **Dreamy** | Pastel suave · borroso · 48 colores |

También podés guardar tus propios presets con thumbnail automático.

---

## Cómo usarla en 30 segundos

1. Arrastrá una imagen al canvas (o probá un ejemplo de la galería de abajo)
2. Hacé click en **Cargar Preset** y elegí uno — ya ves el resultado
3. Ajustá sliders si querés (opcional)
4. **Ctrl+S** para descargar el PNG

Eso es todo. El resto son opciones para afinar.

---

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl+Z` | Deshacer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Rehacer |
| `Ctrl+S` | Exportar PNG |
| `Ctrl+C` | Copiar al portapapeles |
| `?` | Mostrar ayuda de atajos |
| Rueda del mouse | Zoom en el preview |
| Click + arrastrar | Pan en el preview |

---

## Privacidad

Tu imagen **nunca** sale de tu navegador. No hay servidor, no hay API de procesamiento, no hay telemetría, no hay cookies de tracking. Todo el pipeline (resize, dither, cuantización, CRT, export) corre en tu CPU local usando Canvas 2D y WebAssembly.

La única request de red opcional es cuando importás una paleta de Lospec — en ese caso pedís el JSON público de Lospec, nada más.

Los presets guardados y el idioma quedan en `localStorage`. El historial de undo/redo en `sessionStorage` (se borra al cerrar la pestaña).

---

## Formatos y compatibilidad

- **Entrada**: PNG, JPG, WEBP, BMP, GIF (cualquier cosa que el browser pueda decodificar como imagen)
- **Salida**: PNG
- **Navegadores**: Chromium (Chrome, Edge, Brave, Opera), Firefox, Safari — versiones modernas
- **Eyedropper**: funciona en Chromium; en Firefox/Safari se oculta el botón automáticamente
- **Idioma**: Español / Inglés

---

## Correr localmente

Si querés modificar el código o hacer fork:

```bash
git clone https://github.com/AmaruSegovia/psx-converter.git
cd psx-converter
npm install
npm run dev
```

Abre `http://localhost:5173`.

Build de producción:
```bash
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente para probar
```

Requiere Node.js 20+.

---

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Zustand · image-q · Base UI · Framer Motion · JSZip · react-colorful

---

## Licencia

MIT
