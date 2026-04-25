import { describe, it, expect } from 'vitest';
import { translations, t, setLocale, getLocale } from '../i18n';

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
