import { useSyncExternalStore } from 'react';
import { t, getLocale, setLocale, subscribeLocale, type TranslationKey } from '@/lib/i18n';

export function useTranslation() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale);

  return {
    t: (key: TranslationKey) => t(key),
    locale,
    setLocale,
  };
}
