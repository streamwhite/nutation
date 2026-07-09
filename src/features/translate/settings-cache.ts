import { browser } from 'wxt/browser';
import { STORAGE_KEYS } from '@/shared/constants';
import { loadSettings, parseSettings, type ExtensionSettings } from '@/shared/settings';

let cachedSettings: ExtensionSettings | null = null;
let loadPromise: Promise<ExtensionSettings> | null = null;
let listenerAttached = false;

function attachStorageListener(): void {
  if (listenerAttached) {
    return;
  }
  listenerAttached = true;

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.SETTINGS]) {
      return;
    }
    cachedSettings = parseSettings(changes[STORAGE_KEYS.SETTINGS].newValue);
  });
}

export async function getCachedSettings(): Promise<ExtensionSettings> {
  attachStorageListener();
  if (cachedSettings) {
    return cachedSettings;
  }
  if (!loadPromise) {
    loadPromise = loadSettings().then((settings) => {
      cachedSettings = settings;
      return settings;
    });
  }
  return loadPromise;
}

export function primeSettingsCache(): void {
  attachStorageListener();
  void getCachedSettings();
}
