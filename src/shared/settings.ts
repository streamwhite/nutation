import { STORAGE_KEYS, TRANSLATE_CONCURRENCY } from '@/shared/constants';

export type ExtensionSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
  targetLang: string;
  concurrency: number;
};

export function getDefaultSettings(): ExtensionSettings {
  return {
    baseUrl: import.meta.env.VITE_DEFAULT_BASE_URL || 'https://api.openai.com/v1',
    apiKey: '',
    model: import.meta.env.VITE_DEFAULT_MODEL || 'gpt-4o-mini',
    targetLang: import.meta.env.VITE_DEFAULT_TARGET_LANG || 'zh-CN',
    concurrency: TRANSLATE_CONCURRENCY,
  };
}

export function parseSettings(raw: unknown): ExtensionSettings {
  const defaults = getDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const value = raw as Partial<ExtensionSettings>;
  const concurrency = Number(value.concurrency);

  return {
    baseUrl: typeof value.baseUrl === 'string' && value.baseUrl.trim()
      ? value.baseUrl.trim().replace(/\/+$/, '')
      : defaults.baseUrl,
    apiKey: typeof value.apiKey === 'string' ? value.apiKey : defaults.apiKey,
    model: typeof value.model === 'string' && value.model.trim()
      ? value.model.trim()
      : defaults.model,
    targetLang: typeof value.targetLang === 'string' && value.targetLang.trim()
      ? value.targetLang.trim()
      : defaults.targetLang,
    concurrency: Number.isFinite(concurrency) && concurrency > 0
      ? Math.floor(concurrency)
      : defaults.concurrency,
  };
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  return parseSettings(result[STORAGE_KEYS.SETTINGS]);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: parseSettings(settings),
  });
}
