import { get, set, del } from 'idb-keyval';

const KEY = 'psx-last-source';
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB hard cap — anything bigger is silently skipped

interface StoredEntry {
  buffer: ArrayBuffer;
  type: string;
  fileName: string;
  savedAt: number;
}

export interface SavedSource {
  blob: Blob;
  fileName: string;
  savedAt: number;
}

/**
 * Persists the most recently loaded source image to IndexedDB so we can
 * offer a "continue from last session" prompt after a refresh. The raw bytes
 * (ArrayBuffer) are stored alongside MIME type + filename — Blob itself
 * doesn't structured-clone reliably across all engines.
 *
 * Silent on failure (private mode, quota, IDB disabled): UX falls back to
 * "no restore offered" which matches the cold-start experience.
 */
// jsdom Blob has no arrayBuffer() method — fall back to FileReader for tests
// and old browsers without losing the production fast path.
function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(blob);
  });
}

export async function saveSource(blob: Blob, fileName: string): Promise<void> {
  if (blob.size > MAX_SIZE) return;
  try {
    const buffer = await blobToArrayBuffer(blob);
    await set(KEY, { buffer, type: blob.type, fileName, savedAt: Date.now() } satisfies StoredEntry);
  } catch (err) {
    console.warn('Could not persist source to IDB:', err);
  }
}

export async function loadSource(): Promise<SavedSource | null> {
  try {
    const data = await get<StoredEntry>(KEY);
    if (!data || !data.buffer || typeof data.fileName !== 'string') return null;
    const blob = new Blob([data.buffer], { type: data.type || 'image/png' });
    return { blob, fileName: data.fileName, savedAt: data.savedAt };
  } catch {
    return null;
  }
}

export async function clearSource(): Promise<void> {
  try {
    await del(KEY);
  } catch { /* ignore */ }
}
