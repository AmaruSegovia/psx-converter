import { describe, it, expect, vi, afterEach } from 'vitest';
import { translations, t, setLocale, getLocale, detectInitialLocale } from '../i18n';

describe('translations parity', () => {
  it('has identical key sets for en and es', () => {
    const enKeys = Object.keys(translations.en).sort();
    const esKeys = Object.keys(translations.es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('every value is a non-empty string', () => {
    for (const locale of ['en', 'es'] as const) {
      for (const [key, value] of Object.entries(translations[locale])) {
        expect(typeof value, `${locale}.${key}`).toBe('string');
        expect((value as string).length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('detectInitialLocale', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns saved locale when localStorage has one', () => {
    localStorage.setItem('psx-locale', 'es');
    expect(detectInitialLocale()).toBe('es');
  });

  it('falls back to navigator.language when no saved locale', () => {
    localStorage.removeItem('psx-locale');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-AR');
    expect(detectInitialLocale()).toBe('es');
  });

  it('returns en when navigator is en-US', () => {
    localStorage.removeItem('psx-locale');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    expect(detectInitialLocale()).toBe('en');
  });

  it('returns en for unsupported languages', () => {
    localStorage.removeItem('psx-locale');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    expect(detectInitialLocale()).toBe('en');
  });

  it('saved locale beats navigator', () => {
    localStorage.setItem('psx-locale', 'en');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-AR');
    expect(detectInitialLocale()).toBe('en');
  });

  it('ignores invalid saved values', () => {
    localStorage.setItem('psx-locale', 'fr');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    expect(detectInitialLocale()).toBe('en');
  });
});

describe('locale switching', () => {
  it('t() returns the en string by default', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('header.export')).toBe(translations.en['header.export']);
  });

  it('t() switches to es when setLocale(es)', () => {
    setLocale('es');
    expect(getLocale()).toBe('es');
    expect(t('header.export')).toBe(translations.es['header.export']);
    setLocale('en'); // reset
  });
});
