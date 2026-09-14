import { browser } from 'wxt/browser';
import { STORAGE_KEYS } from '@/shared/constants';
import { normalizeApiBaseUrl, normalizeCustomChatCompletionsUrl } from '@/features/llm/api-url';
import { resolveTargetLanguageCode } from '@/shared/languages';
import {
  getProviderPreset,
  inferProviderFromBaseUrl,
  isProviderId,
  normalizeModelName,
  resolveProviderBaseUrl,
  type ProviderId,
} from '@/shared/providers';
import {
  resolveTranslationMode,
  type TranslationMode,
} from '@/shared/translation-mode';
import {
  resolveSummaryPosition,
  type SummaryPosition,
} from '@/features/summarize/summary-position';

export type ExtensionSettings = {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  targetLang: string;
  autoRecoverContentScript: boolean;
  translationMode: TranslationMode;
  summaryPosition: SummaryPosition;
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
    autoRecoverContentScript: true,
    translationMode: resolveTranslationMode(import.meta.env.VITE_DEFAULT_TRANSLATION_MODE),
    summaryPosition: resolveSummaryPosition(
      import.meta.env.VITE_DEFAULT_SUMMARY_POSITION,
    ),
  };
}

export function parseSettings(raw: unknown): ExtensionSettings {
  const defaults = getDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const value = raw as Partial<ExtensionSettings>;
  const rawBaseUrl = typeof value.baseUrl === 'string' ? value.baseUrl : '';
  const inferredBaseUrl = rawBaseUrl.trim()
    ? normalizeApiBaseUrl(rawBaseUrl)
    : defaults.baseUrl;

  const provider = isProviderId(value.provider)
    ? value.provider
    : inferProviderFromBaseUrl(inferredBaseUrl);
  const baseUrl = provider === 'custom'
    ? (rawBaseUrl.trim() ? normalizeCustomChatCompletionsUrl(rawBaseUrl) : '')
    : resolveProviderBaseUrl(provider);
  const rawModel = typeof value.model === 'string' && value.model.trim()
    ? value.model.trim()
    : defaults.model;

  return {
    provider,
    baseUrl,
    apiKey: typeof value.apiKey === 'string' ? value.apiKey : defaults.apiKey,
    model: normalizeModelName(provider, rawModel),
    targetLang: typeof value.targetLang === 'string' && value.targetLang.trim()
      ? resolveTargetLanguageCode(value.targetLang, defaults.targetLang)
      : defaults.targetLang,
    autoRecoverContentScript: value.autoRecoverContentScript !== false,
    translationMode: resolveTranslationMode(value.translationMode),
    summaryPosition: resolveSummaryPosition(
      value.summaryPosition ?? defaults.summaryPosition,
    ),
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

function shouldPersistMigratedSettings(
  raw: unknown,
  parsed: ExtensionSettings,
): boolean {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const storedModel = (raw as Partial<ExtensionSettings>).model;
  return typeof storedModel === 'string'
    && storedModel.trim() !== ''
    && storedModel.trim() !== parsed.model;
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  const raw = result[STORAGE_KEYS.SETTINGS];
  const parsed = parseSettings(raw);

  if (shouldPersistMigratedSettings(raw, parsed)) {
    await browser.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: parsed,
    });
  }

  return parsed;
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
