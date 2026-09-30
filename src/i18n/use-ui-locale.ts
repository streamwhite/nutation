import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { detectLocale, resolveUiLocale, type Locale } from '@/i18n';
import { STORAGE_KEYS } from '@/shared/constants';
import { loadSettings, parseSettings } from '@/shared/settings';

/** Resolves the interface locale from settings, following storage changes. */
export function useUiLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    let cancelled = false;

    void loadSettings()
      .then((settings) => {
        if (!cancelled) {
          setLocale(resolveUiLocale(settings.uiLocale));
        }
      })
      .catch(() => undefined);

    const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      areaName,
    ) => {
      const change = changes[STORAGE_KEYS.SETTINGS];
      if (areaName !== 'local' || !change?.newValue) {
        return;
      }
      setLocale(resolveUiLocale(parseSettings(change.newValue).uiLocale));
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  return locale;
}
