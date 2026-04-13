# CLAUDE.md — PSX Texture Converter

Context for AI assistants continuing development on this project.

## What This Is

A browser-based PSX (PlayStation 1) texture converter. Converts any image into pixel art textures with dithering, palette quantization, CRT effects, and real-time preview. 100% client-side — no backend, no file uploads.

Built with: React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Zustand 5.

## Commands

```bash
npm run dev      # start dev server (localhost:5173)
npm run build    # tsc + vite build → dist/
npm run preview  # serve dist/ locally
npm run lint     # eslint check
```

## Architecture — Critical Concepts

### Canvas Bus (`src/lib/canvasBus.ts`)

**The most important architectural piece.** A module-level pub/sub singleton that holds the result `HTMLCanvasElement` and notifies subscribers when it updates. Used to bypass React/Zustand for preview updates (avoids base64 serialization, which was too slow).

```ts
publishCanvas(canvas)      // called after each processing pass
subscribeCanvas(fn)        // called by PreviewCanvas, BeforeAfterSlider
getResultCanvas()          // used for export and clipboard copy
```

When a new subscriber calls `subscribeCanvas`, it immediately receives the current canvas if one exists. This prevents compare mode showing stale results on tab switch.

### Two-Stage Processing (`src/hooks/useImageProcessor.ts`)

- **Fast preview** — runs synchronously on every settings change via `requestAnimationFrame`. Uses a pre-scaled 512px source cache. Does NOT run quantization (image-q). Applies all transformations directly on canvas.
- **Full quality** — debounced 400ms, runs `processFullPipeline` with image-q quantization. Uses 1024px source cache.

`genRef` (a counter) prevents stale results: each processing pass checks if its `gen` still matches the current `genRef.current` before publishing.

### Source Image Cache

In `imageProcessing.ts`, the source image is cached at two resolutions when loaded:
- `_previewCanvas` — 512px longest side (for fast preview)
- `_fullCanvas` — 1024px longest side (for full quality)

Both are plain `HTMLCanvasElement` objects kept in module scope. Reset when a new image is loaded.

### State (`src/store/converterStore.ts`)

Zustand with `persist` middleware, throttled to 1 write/sec to localStorage. Key fields:

```ts
settings: ConverterSettings   // all processing parameters
activeTab: 'sample' | 'dither' | 'palette' | 'colors'
sourceImage: string | null    // base64 data URL
sourceFileName: string        // original file.name (without extension, for smart filename)
originalDimensions: { w, h }
presets: Preset[]
locale: 'en' | 'es'
```

The persist config has a `merge` function that always spreads `DEFAULT_SETTINGS` first, then saved data. This prevents crashes when new settings fields are added (they get their default value instead of `undefined`).

### Undo/Redo (`src/hooks/useUndoRedo.ts`)

- History stored in `useRef` arrays (not state) for perf
- Commits are debounced 400ms after last change
- On undo/redo, sets `skipRef.current = true` to suppress the next `useEffect` from treating the restore as a new change
- Exposes `historyIndex` and `historyLength` as `useState` (updated in `commitToHistory` and `navigateHistory`) for the visual timeline in Sidebar
- `navigateHistory(idx)` jumps to any history index directly
- Auto-switches the active tab to the tab containing the changed setting on undo/redo (see `KEY_TO_TAB` map)
- Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z keyboard shortcuts registered globally (skips inputs/textareas)

### i18n (`src/lib/i18n.ts`)

Module-level pub/sub, no library. ~115 keys, EN and ES.

```ts
t('key.name')              // get translated string
setLocale('es')            // switch language
subscribeLocale(fn)        // called by useTranslation hook
```

`useTranslation` hook uses `useSyncExternalStore` for reactivity.

### CRT Filter (`src/lib/crtFilter.ts`)

Canvas 2D post-effect applied after quantization. Three independent effects:
- **Scanlines** — dark horizontal lines every 2px
- **RGB shift** — red channel shifted left, blue shifted right (getImageData/putImageData)
- **Vignette** — radial gradient overlay

Guards: skips if canvas `w < 4 || h < 4`, shift capped at `< width/2`. Wrapped in try/catch in pipeline.

### Palette System

`TabPalette.tsx` handles:
- **Custom palette** — react-colorful HSL picker, EyeDropper API, hex input, add/remove colors
- **Lospec import** — `useLospecAPI` hook fetches from Lospec JSON API by slug
- **Built-in palettes** — `src/data/builtinPalettes.ts`

`paletteSource` in settings: `'custom'` | `'lospec'` | `'builtin'`

### InfoTip (`src/components/ui/info-tip.tsx`)

Uses `createPortal` to render tooltips at `document.body` level, bypassing the ScrollArea's `overflow: hidden`. Fixed positioning calculated from the trigger element's `getBoundingClientRect`. Required because regular tooltip approaches were clipped inside the sidebar's ScrollArea.

## Key Files

| File | Purpose |
|---|---|
| `src/lib/canvasBus.ts` | Canvas pub/sub — read before touching preview |
| `src/lib/imageProcessing.ts` | Full pipeline, source cache, `processFastPreview`, `processFullPipeline`, `exportPNG` |
| `src/lib/quantization.ts` | image-q wrapper — `quantizeSync()` returns `Palette`, not `PointContainer` |
| `src/lib/crtFilter.ts` | CRT post-effect with guards |
| `src/lib/i18n.ts` | All translation strings |
| `src/store/converterStore.ts` | Zustand store — check `merge` fn and `partialize` |
| `src/hooks/useImageProcessor.ts` | rAF + debounce processing loop |
| `src/hooks/useUndoRedo.ts` | History, timeline, keyboard shortcuts |
| `src/components/layout/AppShell.tsx` | Main layout — keyboard shortcuts, export, copy, batch, drop overlay, shortcuts modal |
| `src/components/layout/Sidebar.tsx` | Sidebar — history timeline bar |
| `src/components/preview/PreviewCanvas.tsx` | Result canvas + zoom/pan |
| `src/components/preview/BeforeAfterSlider.tsx` | Compare slider mode |
| `src/components/controls/TabPalette.tsx` | Palette editor + Lospec + color picker |
| `src/components/controls/TabColors.tsx` | Color adjustments + CRT sliders |
| `src/components/controls/TabSample.tsx` | Resize controls, aspect lock |

## Known Gotchas

**image-q API**: `quantizeSync()` returns a `Palette` object, NOT a `PointContainer`. To get pixels back you must call `applyPalette()`. The wrapper in `quantization.ts` handles this.

**Base UI differences from shadcn**:
- `DialogTrigger` has no `asChild` prop — use `render` prop: `<DialogTrigger render={<button />}>`
- `Select.Value` onValueChange can return `null` — always guard: `if (v) setX(v)`
- Slider `onValueChange` signature: `(value: number | readonly number[]) => void`

**Zustand persist**: Adding new fields to `ConverterSettings` requires updating `DEFAULT_SETTINGS` only — the `merge` function in persist config auto-handles defaults for existing users.

**Framer Motion + tabs**: Don't wrap `TabsContent` with `AnimatePresence` — it causes flash on tab switch. Animate content *within* each tab instead.

**Swatch animation key**: Use index `i` as key for color swatches, NOT the hex value. Hex as key causes every swatch to re-animate on each color drag.

**canvasBus subscribe immediately**: When `subscribeCanvas(fn)` is called and a canvas already exists, `fn()` is called immediately. This is intentional — it prevents compare mode from showing blank/stale on mount.

**useImageProcessor sourceCanvas**: Must be `useState` (not `useRef`) so the effect that triggers processing re-runs when the source image loads.

## TypeScript Config

`tsconfig.app.json` has `"ignoreDeprecations": "6.0"` due to TypeScript 6 deprecating `baseUrl`. Path aliases configured: `@/*` → `src/*`.

## Adding Translations

Add keys to both `en` and `es` objects in `src/lib/i18n.ts`. Use `t('key')` in components via `const { t } = useTranslation()`.

## Processing Pipeline Order

1. Load source → cache at 512px (preview) and 1024px (full)
2. Resize to target dimensions (nearest / bilinear / bicubic)
3. Apply blur (if > 0)
4. Apply sharpen (if > 0)
5. Apply color adjustments (brightness, contrast, saturation, hue, gamma, RGB tint)
6. **Full only**: Quantize with image-q (K-Means++ or Wu, N colors, with/without dithering)
7. Apply CRT filter (if enabled)
8. Publish canvas via canvasBus

Fast preview skips step 6 (no quantization) but runs all others.
