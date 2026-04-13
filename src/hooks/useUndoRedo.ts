import { useEffect, useRef, useCallback, useState } from 'react';
import { useConverterStore } from '@/store/converterStore';
import type { ConverterSettings } from '@/types';

const MAX_HISTORY = 50;
const COMMIT_DELAY = 400;

const KEY_TO_TAB: Record<string, 'sample' | 'dither' | 'palette' | 'colors'> = {
  width: 'sample', height: 'sample', sizeMode: 'sample', sampleMode: 'sample',
  sampleOffsetX: 'sample', sampleOffsetY: 'sample', blurAmount: 'sample', sharpenAmount: 'sample',
  alphaThreshold: 'dither', distanceMetric: 'dither', ditherMode: 'dither', ditherAmount: 'dither',
  colorCount: 'palette', useKMeansPlusPlus: 'palette', palette: 'palette',
  paletteSource: 'palette', lospecSlug: 'palette',
  brightness: 'colors', contrast: 'colors', saturation: 'colors', hue: 'colors',
  gamma: 'colors', tintRed: 'colors', tintGreen: 'colors', tintBlue: 'colors',
  crtEnabled: 'colors', crtScanlines: 'colors', crtRgbShift: 'colors', crtVignette: 'colors',
};

function findChangedTab(
  from: ConverterSettings,
  to: ConverterSettings,
): 'sample' | 'dither' | 'palette' | 'colors' | null {
  for (const key of Object.keys(KEY_TO_TAB)) {
    const k = key as keyof ConverterSettings;
    if (JSON.stringify(from[k]) !== JSON.stringify(to[k])) {
      return KEY_TO_TAB[key];
    }
  }
  return null;
}

export function useUndoRedo() {
  const settings = useConverterStore((s) => s.settings);
  const updateSettings = useConverterStore((s) => s.updateSettings);
  const setActiveTab = useConverterStore((s) => s.setActiveTab);

  const historyRef = useRef<ConverterSettings[]>([]);
  const indexRef = useRef(-1);
  const skipRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<ConverterSettings | null>(null);

  // Reactive state for UI (timeline)
  const [historyLength, setHistoryLength] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const syncState = useCallback(() => {
    setHistoryLength(historyRef.current.length);
    setHistoryIndex(indexRef.current);
  }, []);

  const commitToHistory = useCallback((snapshot: ConverterSettings) => {
    const history = historyRef.current;
    const idx = indexRef.current;

    if (idx < history.length - 1) {
      historyRef.current = history.slice(0, idx + 1);
    }

    historyRef.current.push({ ...snapshot });

    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }

    indexRef.current = historyRef.current.length - 1;
    pendingRef.current = null;
    syncState();
  }, [syncState]);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }

    if (historyRef.current.length === 0) {
      commitToHistory(settings);
      return;
    }

    pendingRef.current = { ...settings };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) {
        commitToHistory(pendingRef.current);
      }
      timerRef.current = null;
    }, COMMIT_DELAY);
  }, [settings, commitToHistory]);

  const navigateHistory = useCallback((targetIdx: number) => {
    if (pendingRef.current && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      commitToHistory(pendingRef.current);
      targetIdx = Math.min(targetIdx, historyRef.current.length - 1);
    }

    const current = historyRef.current[indexRef.current];
    const target = historyRef.current[targetIdx];
    if (!current || !target) return;

    indexRef.current = targetIdx;
    skipRef.current = true;
    updateSettings(target);
    syncState();

    const tab = findChangedTab(current, target);
    if (tab) setActiveTab(tab);
  }, [updateSettings, setActiveTab, commitToHistory, syncState]);

  const undo = useCallback(() => {
    if (pendingRef.current && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      commitToHistory(pendingRef.current);
    }
    if (indexRef.current <= 0) return;
    navigateHistory(indexRef.current - 1);
  }, [navigateHistory, commitToHistory]);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    navigateHistory(indexRef.current + 1);
  }, [navigateHistory]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return { undo, redo, historyIndex, historyLength, navigateHistory };
}
