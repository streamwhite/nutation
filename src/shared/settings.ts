import { browser } from 'wxt/browser';
import { STORAGE_KEYS, TRANSLATE_CONCURRENCY } from '@/shared/constants';
import { normalizeApiBaseUrl } from '@/features/llm/api-url';
import {
  getProviderPreset,
  inferProviderFromBaseUrl,
  isProviderId,
  type ProviderId,
} from '@/shared/providers';

export type ExtensionSettings = {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  targetLang: string;
  concurrency: number;
  autoRecoverContentScript: boolean;
};

export function getDefaultSettings(): ExtensionSettings {
  const provider: ProviderId = isProviderId(import.meta.env.VITE_DEFAULT_PROVIDER)
    ? import.meta.env.VITE_DEFAULT_PROVIDER
    : 'gemini';
  const preset = getProviderPreset(provider);

  return {
    provider,
    baseUrl: import.meta.env.VITE_DEFAULT_BASE_URL || preset.baseUrl,
    apiKey: '',
    model: import.meta.env.VITE_DEFAULT_MODEL || preset.defaultModel,
    targetLang: import.meta.env.VITE_DEFAULT_TARGET_LANG || 'zh-CN',
    concurrency: TRANSLATE_CONCURRENCY,
    autoRecoverContentScript: true,
  };
}

export function parseSettings(raw: unknown): ExtensionSettings {
  const defaults = getDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const value = raw as Partial<ExtensionSettings>;
  const concurrency = Number(value.concurrency);
  const baseUrl = typeof value.baseUrl === 'string' && value.baseUrl.trim()
    ? normalizeApiBaseUrl(value.baseUrl)
    : defaults.baseUrl;

  return {
    provider: isProviderId(value.provider)
      ? value.provider
      : inferProviderFromBaseUrl(baseUrl),
    baseUrl,
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
    autoRecoverContentScript: value.autoRecoverContentScript !== false,
  };
}

export function applyProviderPreset(
  settings: ExtensionSettings,
  provider: ProviderId,
): ExtensionSettings {
  if (provider === 'custom') {
    return { ...settings, provider };
  }

  const preset = getProviderPreset(provider);
  return {
    ...settings,
    provider,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel,
  };
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  return parseSettings(result[STORAGE_KEYS.SETTINGS]);
}

export async function saveSettings(settings: ExtensionSettings): Promise<ExtensionSettings> {
  const parsed = parseSettings(settings);
  await browser.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: parsed,
  });

  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  const saved = parseSettings(result[STORAGE_KEYS.SETTINGS]);
  if (saved.baseUrl !== parsed.baseUrl || saved.model !== parsed.model) {
    throw new Error('Settings were not persisted. Reload the extension and try again.');
  }
  return saved;
}
