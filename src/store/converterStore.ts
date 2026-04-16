import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { ConverterSettings, Preset, PaletteColor } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getResultCanvas } from '@/lib/canvasBus';

// Throttled localStorage wrapper
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
let _quotaNotified = false;
const originalSetItem = localStorage.setItem.bind(localStorage);

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof DOMException)) return false;
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014
  );
}

async function notifyQuotaOnce() {
  if (_quotaNotified) return;
  _quotaNotified = true;
  try {
    const [{ toast }, i18n] = await Promise.all([
      import('sonner'),
      import('@/lib/i18n'),
    ]);
    toast.error(i18n.t('toast.storageFull'));
  } catch (err) {
    console.error('Could not notify quota error:', err);
  }
}

function stripThumbnails(value: string): string | null {
  try {
    const parsed = JSON.parse(value);
    const presets = parsed?.state?.presets;
    if (!Array.isArray(presets) || presets.length === 0) return null;
    const hasThumbs = presets.some((p: { thumbnail?: string }) => p.thumbnail);
    if (!hasThumbs) return null;
    parsed.state.presets = presets.map((p: Record<string, unknown>) => {
      const { thumbnail: _drop, ...rest } = p;
      void _drop;
      return rest;
    });
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

function persistNow(name: string, value: string) {
  try {
    originalSetItem(name, value);
    return;
  } catch (err) {
    if (!isQuotaError(err)) {
      console.error('localStorage setItem failed:', err);
      return;
    }
    // Quota hit — try shedding thumbnails (usually the biggest payload).
    const stripped = stripThumbnails(value);
    if (stripped) {
      try {
        originalSetItem(name, stripped);
        console.warn('localStorage quota exceeded — preset thumbnails dropped');
        notifyQuotaOnce();
        return;
      } catch { /* still too big, fall through */ }
    }
    console.warn('localStorage quota exceeded — skipping persist');
    notifyQuotaOnce();
  }
}

function throttledSetItem(name: string, value: string) {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    persistNow(name, value);
    _persistTimer = null;
  }, 1000);
}

interface ConverterStore {
  settings: ConverterSettings;
  sourceImage: string | null;
  resultImage: string | null;
  isProcessing: boolean;
  activeTab: 'sample' | 'dither' | 'palette' | 'colors' | 'effects';
  presets: Preset[];
  originalWidth: number;
  originalHeight: number;
  resultWidth: number;
  resultHeight: number;
  sourceFileName: string;
  generatedPalette: PaletteColor[];

  updateSettings: (partial: Partial<ConverterSettings>) => void;
  setGeneratedPalette: (palette: PaletteColor[]) => void;
  setSourceImage: (base64: string, fileName?: string) => void;
  setResult: (base64: string | null, w?: number, h?: number) => void;
  setIsProcessing: (v: boolean) => void;
  setActiveTab: (tab: 'sample' | 'dither' | 'palette' | 'colors' | 'effects') => void;
  setOriginalDimensions: (w: number, h: number) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  loadSettings: (settings: ConverterSettings) => void;
  deletePreset: (id: string) => void;
  resetSettings: () => void;
}

export const useConverterStore = create<ConverterStore>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      sourceImage: null,
      resultImage: null,
      isProcessing: false,
      activeTab: 'sample',
      presets: [],
      originalWidth: 0,
      originalHeight: 0,
      resultWidth: 0,
      resultHeight: 0,
      sourceFileName: '',
      generatedPalette: [],

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...DEFAULT_SETTINGS, ...state.settings, ...partial },
        })),

      setGeneratedPalette: (palette) => set({ generatedPalette: palette }),

      setSourceImage: (base64, fileName) => {
        sessionStorage.removeItem('psx-history');
        // Drop any cached palette from a prior image so tier-2 preview
        // doesn't map the new image through the old palette.
        import('@/lib/quantizationClient').then((m) => m.clearLastPalette());
        return set({
          sourceImage: base64,
          resultImage: null,
          resultWidth: 0,
          resultHeight: 0,
          sourceFileName: fileName ? fileName.replace(/\.[^.]+$/, '') : '',
        });
      },

      setResult: (base64, w, h) => set({
        resultImage: base64,
        resultWidth: w ?? 0,
        resultHeight: h ?? 0,
      }),

      setIsProcessing: (v) => set({ isProcessing: v }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setOriginalDimensions: (w, h) => set({ originalWidth: w, originalHeight: h }),

      savePreset: (name) => {
        const state = get();
        // Encode thumbnail lazily from current canvas — toDataURL is slow and
        // only needed on save, not on every pipeline run.
        const canvas = getResultCanvas();
        const thumbnail = canvas ? canvas.toDataURL('image/png') : undefined;
        const preset: Preset = {
          id: uuidv4(),
          name,
          settings: { ...state.settings },
          thumbnail,
          createdAt: Date.now(),
        };
        set((s) => ({ presets: [...s.presets, preset] }));
      },

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) {
          set({ settings: { ...preset.settings } });
        }
      },

      loadSettings: (settings) => set({ settings: { ...settings } }),

      deletePreset: (id) =>
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),

      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: 'psx-converter-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          throttledSetItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        settings: state.settings,
        presets: state.presets,
      } as unknown as typeof state),
      merge: (persisted, current) => {
        const p = persisted as Partial<typeof current>;
        return {
          ...current,
          ...p,
          // Always merge settings with defaults so new fields get their defaults
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
        };
      },
    }
  )
);
