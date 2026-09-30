import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { STORAGE_KEYS } from '@/shared/constants';
import {
  loadSettings,
  parseSettings,
  saveSettings,
  type ExtensionSettings,
} from '@/shared/settings';

export type SettingsStore = {
  settings: ExtensionSettings | null;
  error: string | null;
  save: (patch: Partial<ExtensionSettings>) => Promise<ExtensionSettings>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useOptionsSettings(): SettingsStore {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settingsRef = useRef<ExtensionSettings | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const save = useCallback(async (patch: Partial<ExtensionSettings>) => {
    const current = settingsRef.current ?? await loadSettings();
    const saved = await saveSettings({ ...current, ...patch });
    setSettings(saved);
    return saved;
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadSettings()
      .then((loaded) => {
        if (!cancelled) {
          setSettings(loaded);
        }
      })
      .catch((failure: unknown) => {
        if (!cancelled) {
          setError(errorMessage(failure));
        }
      });

    const listener: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      areaName,
    ) => {
      const change = changes[STORAGE_KEYS.SETTINGS];
      if (areaName !== 'local' || !change?.newValue) {
        return;
      }
      setSettings(parseSettings(change.newValue));
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  return { settings, error, save };
}
