import { useEffect, useRef, useCallback, useState } from 'react';
import { useConverterStore } from '@/store/converterStore';
import type { ConverterSettings } from '@/types';

const MAX_HISTORY = 50;
const COMMIT_DELAY = 400;
const GROUP_WINDOW_MS = 2000;

const KEY_TO_TAB: Record<string, 'sample' | 'dither' | 'palette' | 'colors' | 'effects'> = {
  width: 'sample', height: 'sample', sizeMode: 'sample', sampleMode: 'sample',
  sampleOffsetX: 'sample', sampleOffsetY: 'sample', blurAmount: 'sample', sharpenAmount: 'sample',
  alphaThreshold: 'dither', transparencyMode: 'dither', colorKeyHex: 'dither',
  distanceMetric: 'dither', ditherMode: 'dither', ditherAmount: 'dither',
  colorCount: 'palette', useKMeansPlusPlus: 'palette', palette: 'palette',
  paletteSource: 'palette', lospecSlug: 'palette',
  brightness: 'colors', contrast: 'colors', saturation: 'colors', hue: 'colors',
  gamma: 'colors', tintRed: 'colors', tintGreen: 'colors', tintBlue: 'colors',
  posterize: 'effects',
  crtEnabled: 'effects', crtScanlines: 'effects', crtRgbShift: 'effects', crtVignette: 'effects',
  grainAmount: 'effects',
  levelsInLow: 'colors', levelsInHigh: 'colors', levelsOutLow: 'colors', levelsOutHigh: 'colors',
};

const KEY_LABELS: Record<string, string> = {
  width: 'Width', height: 'Height', sizeMode: 'Size mode', sampleMode: 'Sample',
  sampleOffsetX: 'Offset X', sampleOffsetY: 'Offset Y',
  blurAmount: 'Blur', sharpenAmount: 'Sharpen',
  alphaThreshold: 'Alpha', transparencyMode: 'Transparency', colorKeyHex: 'Color key',
  distanceMetric: 'Distance', ditherMode: 'Dither', ditherAmount: 'Dither amount',
  colorCount: 'Colors', useKMeansPlusPlus: 'K-means++',
  palette: 'Palette', paletteSource: 'Palette source', lospecSlug: 'Lospec',
  brightness: 'Brightness', contrast: 'Contrast', saturation: 'Saturation',
  hue: 'Hue', gamma: 'Gamma',
  tintRed: 'Red', tintGreen: 'Green', tintBlue: 'Blue',
  posterize: 'Posterize',
  crtEnabled: 'CRT', crtScanlines: 'Scanlines', crtRgbShift: 'RGB shift', crtVignette: 'Vignette',
  grainAmount: 'Grain',
  levelsInLow: 'In black', levelsInHigh: 'In white', levelsOutLow: 'Out black', levelsOutHigh: 'Out white',
};

interface HistoryEntry {
  settings: ConverterSettings;
  label: string;
  changedKey: string | null;
  timestamp: number;
}

// Transient override: the next commit uses this label instead of deriving one from the diff.
// Used for batch-change actions like preset loads and reset, where a diff-derived label
// (e.g. "Width −35") would be misleading because many fields changed at once.
let _pendingLabel: string | null = null;

export function setPendingHistoryLabel(label: string | null) {
  _pendingLabel = label;
}

function consumePendingLabel(): string | null {
  const l = _pendingLabel;
  _pendingLabel = null;
  return l;
}

const HISTORY_KEY = 'psx-history';

function saveHistoryToSession(history: HistoryEntry[], index: number) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify({ history, index, v: 2 }));
  } catch { /* quota exceeded — ignore */ }
}

function loadHistoryFromSession(): { history: HistoryEntry[]; index: number } | null {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migration: reject old format (v1 had plain ConverterSettings[])
    if (parsed.v !== 2 || !Array.isArray(parsed.history)) return null;
    return { history: parsed.history, index: parsed.index };
  } catch { return null; }
}

function findChangedKey(from: ConverterSettings, to: ConverterSettings): string | null {
  for (const key of Object.keys(KEY_TO_TAB)) {
    const k = key as keyof ConverterSettings;
    if (JSON.stringify(from[k]) !== JSON.stringify(to[k])) return key;
  }
  return null;
}

function formatNumberDiff(prev: number, next: number): string {
  const diff = next - prev;
  const abs = Math.abs(diff);
  const sign = diff > 0 ? '+' : '−';
  if (abs < 0.01) return next.toFixed(2);
  if (abs < 1) return `${sign}${abs.toFixed(2)}`;
  if (abs < 10) return `${sign}${abs.toFixed(1)}`;
  return `${sign}${Math.round(abs)}`;
}

function describeChange(key: string, prev: unknown, next: unknown): string {
  const label = KEY_LABELS[key] ?? key;

  switch (key) {
    case 'paletteSource':
      return `Palette → ${String(next)}`;
    case 'palette': {
      const n = Array.isArray(next) ? next.length : 0;
      return `Palette (${n} colors)`;
    }
    case 'ditherMode':
      return `Dither → ${String(next)}`;
    case 'distanceMetric':
      return `Distance → ${String(next)}`;
    case 'sampleMode':
      return `Sample → ${String(next)}`;
    case 'sizeMode':
      return `Size → ${String(next)}`;
    case 'transparencyMode':
      return `Transparency → ${String(next)}`;
    case 'crtEnabled':
      return next ? 'CRT on' : 'CRT off';
    case 'useKMeansPlusPlus':
      return next ? 'K-means++ on' : 'K-means++ off';
    case 'colorKeyHex':
      return `Color key ${String(next)}`;
    case 'lospecSlug':
      return `Lospec ${String(next)}`;
  }

  if (typeof prev === 'number' && typeof next === 'number') {
    return `${label} ${formatNumberDiff(prev, next)}`;
  }
  return `${label} changed`;
}

export function useUndoRedo() {
  const settings = useConverterStore((s) => s.settings);
  const updateSettings = useConverterStore((s) => s.updateSettings);
  const setActiveTab = useConverterStore((s) => s.setActiveTab);

  const historyRef = useRef<HistoryEntry[]>([]);
  const indexRef = useRef(-1);
  const skipRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ settings: ConverterSettings; label: string | null } | null>(null);

  const [historyLength, setHistoryLength] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [, setLabelTick] = useState(0);

  const syncState = useCallback(() => {
    setHistoryLength(historyRef.current.length);
    setHistoryIndex(indexRef.current);
    setLabelTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const saved = loadHistoryFromSession();
    if (saved && saved.history.length > 0) {
      historyRef.current = saved.history;
      indexRef.current = saved.index;
      syncState();
      skipRef.current = true;
      updateSettings(saved.history[saved.index].settings);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitToHistory = useCallback((snapshot: ConverterSettings, overrideLabel: string | null = null) => {
    const history = historyRef.current;
    const idx = indexRef.current;
    const now = Date.now();

    if (idx < history.length - 1) {
      historyRef.current = history.slice(0, idx + 1);
    }

    const prevEntry = historyRef.current[historyRef.current.length - 1];
    const prevSettings = prevEntry?.settings;
    const changedKey = prevSettings ? findChangedKey(prevSettings, snapshot) : null;
    const computedLabel = prevSettings && changedKey
      ? describeChange(changedKey, prevSettings[changedKey as keyof ConverterSettings], snapshot[changedKey as keyof ConverterSettings])
      : 'Initial';
    const label = overrideLabel ?? computedLabel;

    // Group: replace last entry if same key within window and we're at the tip.
    // Disable grouping when overrideLabel is set — batch actions should stand on their own.
    const isAtTip = indexRef.current === historyRef.current.length - 1;
    const canGroup = !overrideLabel
      && prevEntry
      && changedKey
      && prevEntry.changedKey === changedKey
      && (now - prevEntry.timestamp) < GROUP_WINDOW_MS
      && isAtTip;

    if (canGroup) {
      historyRef.current[historyRef.current.length - 1] = {
        settings: { ...snapshot },
        label,
        changedKey,
        timestamp: now,
      };
    } else {
      historyRef.current.push({
        settings: { ...snapshot },
        label,
        changedKey,
        timestamp: now,
      });
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current = historyRef.current.slice(-MAX_HISTORY);
      }
      indexRef.current = historyRef.current.length - 1;
    }

    pendingRef.current = null;
    syncState();
    saveHistoryToSession(historyRef.current, indexRef.current);
  }, [syncState]);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }

    if (historyRef.current.length === 0) {
      commitToHistory(settings, consumePendingLabel());
      return;
    }

    // Keep label from first effect in this debounce window; subsequent effects
    // just update the settings snapshot so the committed entry reflects the latest state.
    if (pendingRef.current) {
      pendingRef.current.settings = { ...settings };
    } else {
      pendingRef.current = { settings: { ...settings }, label: consumePendingLabel() };
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) {
        commitToHistory(pendingRef.current.settings, pendingRef.current.label);
      }
      timerRef.current = null;
    }, COMMIT_DELAY);
  }, [settings, commitToHistory]);

  const navigateHistory = useCallback((targetIdx: number) => {
    if (pendingRef.current && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      commitToHistory(pendingRef.current.settings, pendingRef.current.label);
      targetIdx = Math.min(targetIdx, historyRef.current.length - 1);
    }

    const current = historyRef.current[indexRef.current];
    const target = historyRef.current[targetIdx];
    if (!current || !target) return;

    indexRef.current = targetIdx;
    skipRef.current = true;
    updateSettings(target.settings);
    syncState();

    if (target.changedKey && KEY_TO_TAB[target.changedKey]) {
      setActiveTab(KEY_TO_TAB[target.changedKey]);
    }
  }, [updateSettings, setActiveTab, commitToHistory, syncState]);

  const undo = useCallback(() => {
    if (pendingRef.current && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      commitToHistory(pendingRef.current.settings, pendingRef.current.label);
    }
    if (indexRef.current <= 0) return;
    navigateHistory(indexRef.current - 1);
  }, [navigateHistory, commitToHistory]);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    navigateHistory(indexRef.current + 1);
  }, [navigateHistory]);

  const clearHistory = useCallback(() => {
    const current = historyRef.current[indexRef.current];
    if (!current) return;
    historyRef.current = [{ ...current, label: 'Initial', changedKey: null, timestamp: Date.now() }];
    indexRef.current = 0;
    syncState();
    saveHistoryToSession(historyRef.current, indexRef.current);
  }, [syncState]);

  const getEntryLabel = useCallback((idx: number): string => {
    return historyRef.current[idx]?.label ?? '';
  }, []);

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

  return { undo, redo, historyIndex, historyLength, navigateHistory, clearHistory, getEntryLabel };
}
