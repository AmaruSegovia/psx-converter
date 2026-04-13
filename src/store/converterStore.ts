import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { ConverterSettings, Preset } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

// Throttled localStorage wrapper
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
const originalSetItem = localStorage.setItem.bind(localStorage);

function throttledSetItem(name: string, value: string) {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    originalSetItem(name, value);
    _persistTimer = null;
  }, 1000);
}

interface ConverterStore {
  settings: ConverterSettings;
  sourceImage: string | null;
  resultImage: string | null;
  isProcessing: boolean;
  activeTab: 'sample' | 'dither' | 'palette' | 'colors';
  presets: Preset[];
  originalWidth: number;
  originalHeight: number;
  resultWidth: number;
  resultHeight: number;
  sourceFileName: string;

  updateSettings: (partial: Partial<ConverterSettings>) => void;
  setSourceImage: (base64: string, fileName?: string) => void;
  setResult: (base64: string | null, w?: number, h?: number) => void;
  setIsProcessing: (v: boolean) => void;
  setActiveTab: (tab: 'sample' | 'dither' | 'palette' | 'colors') => void;
  setOriginalDimensions: (w: number, h: number) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
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

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...DEFAULT_SETTINGS, ...state.settings, ...partial },
        })),

      setSourceImage: (base64, fileName) => set({
        sourceImage: base64,
        resultImage: null,
        resultWidth: 0,
        resultHeight: 0,
        sourceFileName: fileName ? fileName.replace(/\.[^.]+$/, '') : '',
      }),

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
        const preset: Preset = {
          id: uuidv4(),
          name,
          settings: { ...state.settings },
          thumbnail: state.resultImage ?? undefined,
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
