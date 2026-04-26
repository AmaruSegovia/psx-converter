import { describe, it, expect } from 'vitest';
import { encodeSettings, decodeSettings } from '../shareLink';
import { DEFAULT_SETTINGS } from '@/types';
import type { ConverterSettings } from '@/types';

describe('shareLink — human-readable encoding', () => {
  it('encodes DEFAULT_SETTINGS as empty string (zero diff)', () => {
    expect(encodeSettings(DEFAULT_SETTINGS)).toBe('');
  });

  it('decodes empty payload to DEFAULT_SETTINGS', () => {
    expect(decodeSettings('')).toEqual(DEFAULT_SETTINGS);
  });

  it('encodes single field tweak with short key', () => {
    const tweaked = { ...DEFAULT_SETTINGS, brightness: 0.3 };
    expect(encodeSettings(tweaked)).toBe('b=0.3');
  });

  it('encodes multiple tweaks separated by &', () => {
    const tweaked = { ...DEFAULT_SETTINGS, width: 256, height: 144, ditherMode: 'jarvis' as const };
    const enc = encodeSettings(tweaked);
    expect(enc).toContain('w=256');
    expect(enc).toContain('h=144');
    expect(enc).toContain('d=jarvis');
    expect(enc.split('&')).toHaveLength(3);
  });

  it('round-trips DEFAULT_SETTINGS', () => {
    expect(decodeSettings(encodeSettings(DEFAULT_SETTINGS))).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips heavy settings (custom palette + tweaks)', () => {
    const heavy: ConverterSettings = {
      ...DEFAULT_SETTINGS,
      width: 256,
      height: 144,
      brightness: 0.3,
      contrast: 1.2,
      crtEnabled: true,
      crtScanlines: 0.4,
      grainAmount: 0.5,
      grainSeed: 0x1234abcd,
      grainSeedLocked: true,
      paletteSource: 'custom',
      palette: [
        { r: 255, g: 0, b: 0, hex: '#ff0000' },
        { r: 0, g: 255, b: 0, hex: '#00ff00' },
        { r: 0, g: 0, b: 255, hex: '#0000ff' },
      ],
    };
    expect(decodeSettings(encodeSettings(heavy))).toEqual(heavy);
  });

  it('encodes booleans as 1/0', () => {
    const enc = encodeSettings({ ...DEFAULT_SETTINGS, crtEnabled: true });
    expect(enc).toBe('crt=1');
  });

  it('encodes palette as dot-separated hex strings', () => {
    const enc = encodeSettings({
      ...DEFAULT_SETTINGS,
      paletteSource: 'custom',
      palette: [
        { r: 255, g: 0, b: 0, hex: '#ff0000' },
        { r: 0, g: 255, b: 0, hex: '#00ff00' },
      ],
    });
    expect(enc).toContain('pal=ff0000.00ff00');
    expect(enc).toContain('ps=custom');
  });

  it('strips # from colorKeyHex on encode', () => {
    const enc = encodeSettings({ ...DEFAULT_SETTINGS, colorKeyHex: '#ABCDEF' });
    expect(enc).toContain('ck=ABCDEF');
    expect(enc).not.toContain('%23');
  });

  it('decode adds # back to colorKeyHex', () => {
    const decoded = decodeSettings('ck=abcdef');
    expect(decoded?.colorKeyHex).toBe('#abcdef');
  });

  it('returns null for non-numeric value where number expected', () => {
    expect(decodeSettings('w=notanumber')).toBeNull();
  });

  it('ignores unknown keys silently', () => {
    const decoded = decodeSettings('foo=bar&w=128');
    expect(decoded?.width).toBe(128);
  });

  it('merges defaults so older payloads keep working when fields are added', () => {
    // Simulate an old payload that doesn't include grainSeed.
    const decoded = decodeSettings('w=128');
    expect(decoded?.grainSeed).toBe(DEFAULT_SETTINGS.grainSeed);
    expect(decoded?.grainSeedLocked).toBe(DEFAULT_SETTINGS.grainSeedLocked);
  });

  it('payload for default + 16-color custom palette under 250 chars', () => {
    const sixteen: ConverterSettings = {
      ...DEFAULT_SETTINGS,
      paletteSource: 'custom',
      palette: Array.from({ length: 16 }, (_, i) => ({
        r: i * 16, g: 255 - i * 16, b: 128, hex: `#${(i * 16).toString(16).padStart(2, '0')}80${(255 - i * 16).toString(16).padStart(2, '0')}`,
      })),
    };
    expect(encodeSettings(sixteen).length).toBeLessThan(250);
  });
});
