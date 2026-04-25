import { useCallback, useSyncExternalStore } from 'react';
import { t, getLocale, setLocale, subscribeLocale, type TranslationKey } from '@/lib/i18n';

export function useTranslation() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale);

  // Stable identity across renders. Bare `t()` reads current locale at call
  // time, so consumers always get the right translation; the hook just
  // triggers re-render via useSyncExternalStore when locale changes.
  const tFn = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => t(key, vars),
    [],
  );

  return { t: tFn, locale, setLocale };
}
