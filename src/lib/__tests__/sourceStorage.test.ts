import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { saveSource, loadSource, clearSource } from '../sourceStorage';

describe('sourceStorage', () => {
  beforeEach(async () => {
    await clearSource();
  });

  it('returns null when nothing saved', async () => {
    expect(await loadSource()).toBeNull();
  });

  it('round-trips a Blob with metadata', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
    await saveSource(blob, 'foo.png');
    const restored = await loadSource();
    expect(restored).not.toBeNull();
    expect(restored!.fileName).toBe('foo.png');
    expect(restored!.blob).toBeInstanceOf(Blob);
    expect(restored!.blob.size).toBe(4);
    expect(restored!.savedAt).toBeTypeOf('number');
  });

  it('clearSource removes the entry', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    await saveSource(blob, 'x.png');
    expect(await loadSource()).not.toBeNull();
    await clearSource();
    expect(await loadSource()).toBeNull();
  });

  it('skips images larger than 50 MB', async () => {
    // 51 MB Uint8Array — fake-indexeddb handles it but our cap should reject.
    const big = new Blob([new Uint8Array(51 * 1024 * 1024)], { type: 'image/png' });
    await saveSource(big, 'huge.png');
    expect(await loadSource()).toBeNull();
  });
});
