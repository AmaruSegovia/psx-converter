# CLAUDE.md — PSX Texture Converter

`@README.md` describe qué es y cómo correrlo. Este archivo cubre lo que necesitás
saber **antes de tocar el código**.

## Commands

```bash
npm run dev        # vite dev server
npm run build      # tsc -b && vite build → dist/
npm run lint       # eslint
npm run typecheck  # tsc -b --noEmit
npm test           # vitest watch
npm run test:run   # vitest one-shot (CI)
npm run preview    # serve dist/ localmente
```

## Architecture — non-obvious concepts

### Canvas Bus (`src/lib/canvasBus.ts`)
Pub/sub a nivel módulo que tiene el `HTMLCanvasElement` resultado y notifica a los
suscriptores. **Bypassa React/Zustand** para evitar serialización base64 (era lento).
Cuando alguien llama `subscribeCanvas(fn)` y ya hay canvas, `fn` se dispara
inmediatamente — esto previene "compare mode" mostrando stale al cambiar de tab.

### 3-tier preview (`src/hooks/useImageProcessor.ts`)
1. **Tier 1** — `requestAnimationFrame` síncrono, sin cuantización, sobre source 512px.
2. **Tier 2** — worker async fast-quant a 256px reusando la última paleta generada (latest-wins via `quantizationClient`).
3. **Tier 3** — debounce 400ms, pipeline completo con cuantización. Usa source 1024px.

Cada tier tiene su `genRef` para descartar resultados stale.

### Source cache (`src/lib/imageProcessing.ts`)
Al cargar imagen, se cachean dos canvases en module scope: 512px (preview) y 1024px (full).
Reset al cambiar la imagen. **No mutar fuera del módulo.**

### Worker quantization (`src/lib/quantizationClient.ts`)
`postMessage` transfiere el `ArrayBuffer` (zero-copy). `_workerBroken` flag cae a main thread tras crash; `onWorkerCrash` notifica suscriptores. **Sin recovery automática** (Tier 2 del roadmap).

### Undo/redo (`src/hooks/useUndoRedo.ts`)
Historial en `useRef`, no `useState` (perf). Commits debounced 400ms. Al hacer undo/redo:
- `skipRef.current = true` suprime el siguiente effect que trataría el restore como cambio nuevo.
- Cambia el `activeTab` al que contiene el setting modificado (ver `KEY_TO_TAB` en `src/lib/historyLabels.ts`).

### i18n (`src/lib/i18n.ts`)
Pub/sub sin librería. ~120 keys EN/ES. **Soporta interpolación**: `t('toast.X', { name: 'foo' })` reemplaza `{name}`.
`useTranslation` hace `useSyncExternalStore` y memoiza `t` con `useCallback` (identity estable — incluirlo en deps de `useCallback` consumidores no causa churn).

### InfoTip (`src/components/ui/info-tip.tsx`)
`createPortal` a `document.body` para escapar el `overflow:hidden` del `ScrollArea`. Posición se calcula con `getBoundingClientRect`.

## Project conventions (DO follow)

- **Toast strings: siempre `t('key.X', { vars })`. Nunca literales en componentes.** Si es nueva key, agregar a EN y ES en `src/lib/i18n.ts`.
- **Helpers puros van en `src/lib/*`** y se exportan con `export` (ej. `historyLabels.ts`). Hooks importan, no duplican. Esto los hace testeables sin renderizar React.
- **Agregar campo a `ConverterSettings`**: actualizar **solo** `DEFAULT_SETTINGS` en `src/types/index.ts`. El `merge` del store ya maneja presets viejos rellenando defaults.
- **Botones-icono**: `aria-label` (no `title`-only) y SVGs decorativos con `aria-hidden="true" focusable="false"`.

## Testing (`vitest`)

- Setup: `src/test/setup.ts` polyfillea `ImageData` (jsdom no la trae).
- **jsdom NO implementa Canvas 2D context** — tests que llaman `getContext('2d')` reciben `null`. Tests de CRT/canvas pixel ops cubren solo guards estructurales (ver `crtFilter.test.ts`).
- Tests viven en `src/**/__tests__/*.test.ts`. Mockear `Math.random` para tests deterministas de grain.

## Known gotchas

- **image-q**: `quantizeSync()` retorna `Palette`, NO `PointContainer`. Para pixels usar `applyPalette()`. El wrapper en `quantization.ts` lo maneja.
- **Base UI ≠ shadcn**:
  - `DialogTrigger` no tiene `asChild`; usar `render={<button />}`.
  - `Select.Value` `onValueChange` puede dar `null` — guardar siempre: `if (v) setX(v)`.
  - Slider `onValueChange`: `(value: number | readonly number[]) => void`.
- **Framer Motion + tabs**: NO envolver `TabsContent` con `AnimatePresence` (causa flash). Animar contenido *dentro* de cada tab.
- **Swatch animation key**: usar índice `i`, no el hex (sino re-anima al draggear color).
- **`useImageProcessor` sourceCanvas**: tiene que ser `useState` (no `useRef`) para que el effect re-corra al cargar source.
- **vite-plugin-pwa**: requiere `legacy-peer-deps=true` en `.npmrc` (Vite 8 vs peer-spec 7). Ya está configurado.
- **Service worker**: solo se registra en PROD (ver `main.tsx`). En dev no hay caché — cambios se ven inmediato.
- **`tsconfig.app.json`** tiene `"ignoreDeprecations": "6.0"` por TS6 deprecando `baseUrl`. Path aliases `@/*` → `src/*`.

## Don't touch (TODO Tier 2)

- **`processFastPreview` y `processFullPipeline` aplican el pipeline en orden DISTINTO** (color antes vs después del resize). El preview rápido no coincide pixel-a-pixel con el final. Realinear requiere fixture de regresión — no tocar sin uno.
- `sampleOffsetX/Y` fueron eliminados; presets viejos los traen y `merge` los descarta. No reintroducir sin implementar de verdad en `resizeImage`.
