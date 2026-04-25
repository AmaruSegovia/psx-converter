import { useEffect, useRef, useCallback, useState } from 'react';
import { useConverterStore } from '@/store/converterStore';
import type { ConverterSettings } from '@/types';
import { KEY_TO_TAB, findChangedKey, describeChange } from '@/lib/historyLabels';

const MAX_HISTORY = 50;
const COMMIT_DELAY = 400;
const GROUP_WINDOW_MS = 2000;

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
