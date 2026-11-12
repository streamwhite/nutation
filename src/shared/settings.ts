import { browser } from 'wxt/browser';
import { DEFAULT_LOCALE, formatMessage, resolveLocaleSetting, type LocaleSetting } from '@/i18n';
import { STORAGE_KEYS, PAGE_INFO_SEPARATOR, TRANSLATION_CACHE_MAX_ENTRIES } from '@/shared/constants';
import { normalizeApiBaseUrl, normalizeCustomChatCompletionsUrl } from '@/features/llm/api-url';
import { resolveCacheMaxEntries } from '@/features/translate/cache-max-entries';
import {
  parseTranslateOnOpenRules,
  type TranslateOnOpenRule,
} from '@/features/translate-on-open/match';
import {
  resolveSummaryPosition,
  type SummaryPosition,
} from '@/features/summarize/summary-position';
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

export type ExtensionSettings = {
  provider: ProviderId;
  allowChinaDataTransfer: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  targetLang: string;
  autoRecoverContentScript: boolean;
  translationMode: TranslationMode;
  translateOnOpen: boolean;
  translateOnOpenRules: TranslateOnOpenRule[];
  summaryPosition: SummaryPosition;
  cacheMaxEntries: number;
  copyIncludeTitle: boolean;
  copyIncludeDescription: boolean;
  copyIncludeLink: boolean;
  copySeparator: string;
  uiLocale: LocaleSetting;
};

export function getDefaultSettings(): ExtensionSettings {
  const provider: ProviderId = isProviderId(import.meta.env.VITE_DEFAULT_PROVIDER)
    ? import.meta.env.VITE_DEFAULT_PROVIDER
    : 'gemini';
  const preset = getProviderPreset(provider);

  return {
    provider,
    allowChinaDataTransfer: provider === 'deepseek',
    baseUrl: import.meta.env.VITE_DEFAULT_BASE_URL || preset.baseUrl,
    apiKey: '',
    model: import.meta.env.VITE_DEFAULT_MODEL || preset.defaultModel,
    targetLang: import.meta.env.VITE_DEFAULT_TARGET_LANG || 'zh-CN',
    autoRecoverContentScript: true,
    translationMode: resolveTranslationMode(import.meta.env.VITE_DEFAULT_TRANSLATION_MODE),
    translateOnOpen: true,
    translateOnOpenRules: [],
    summaryPosition: resolveSummaryPosition(
      import.meta.env.VITE_DEFAULT_SUMMARY_POSITION,
    ),
    cacheMaxEntries: resolveCacheMaxEntries(
      import.meta.env.VITE_DEFAULT_CACHE_MAX_ENTRIES,
      TRANSLATION_CACHE_MAX_ENTRIES,
    ),
    copyIncludeTitle: true,
    copyIncludeDescription: true,
    copyIncludeLink: true,
    copySeparator: PAGE_INFO_SEPARATOR,
    uiLocale: resolveLocaleSetting(import.meta.env.VITE_DEFAULT_UI_LOCALE),
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
  const allowChinaDataTransfer = value.allowChinaDataTransfer === true;
  const providerWithoutChinaConsent = provider === 'deepseek' && !allowChinaDataTransfer;
  const fallbackProvider = defaults.provider === 'deepseek' || defaults.provider === 'custom'
    ? 'openai'
    : defaults.provider;
  const resolvedProvider = providerWithoutChinaConsent ? fallbackProvider : provider;
  const baseUrl = resolvedProvider === 'custom'
    ? (rawBaseUrl.trim() ? normalizeCustomChatCompletionsUrl(rawBaseUrl) : '')
    : resolveProviderBaseUrl(resolvedProvider);
  const rawModel = typeof value.model === 'string' && value.model.trim()
    ? value.model.trim()
    : defaults.model;
  const model = providerWithoutChinaConsent
    ? getProviderPreset(resolvedProvider).defaultModel
    : normalizeModelName(resolvedProvider, rawModel);

  return {
    provider: resolvedProvider,
    allowChinaDataTransfer,
    baseUrl,
    apiKey: typeof value.apiKey === 'string' && value.apiKey.trim()
      ? value.apiKey
      : defaults.apiKey,
    model,
    targetLang: typeof value.targetLang === 'string' && value.targetLang.trim()
      ? resolveTargetLanguageCode(value.targetLang, defaults.targetLang)
      : defaults.targetLang,
    autoRecoverContentScript: value.autoRecoverContentScript !== false,
    translationMode: resolveTranslationMode(value.translationMode),
    translateOnOpen: value.translateOnOpen !== false,
    translateOnOpenRules: parseTranslateOnOpenRules(value.translateOnOpenRules),
    summaryPosition: resolveSummaryPosition(
      value.summaryPosition ?? defaults.summaryPosition,
    ),
    cacheMaxEntries: resolveCacheMaxEntries(value.cacheMaxEntries, defaults.cacheMaxEntries),
    copyIncludeTitle: value.copyIncludeTitle !== false,
    copyIncludeDescription: value.copyIncludeDescription !== false,
    copyIncludeLink: value.copyIncludeLink !== false,
    copySeparator: typeof value.copySeparator === 'string' && value.copySeparator !== ''
      ? value.copySeparator
      : defaults.copySeparator,
    uiLocale: resolveLocaleSetting(value.uiLocale),
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
  const storedProvider = (raw as Partial<ExtensionSettings>).provider;
  const providerChanged = isProviderId(storedProvider) && storedProvider !== parsed.provider;
  return providerChanged || (
    typeof storedModel === 'string'
    && storedModel.trim() !== ''
    && storedModel.trim() !== parsed.model
  );
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
    throw new Error(formatMessage(DEFAULT_LOCALE, 'options.error.notPersisted'));
  }
  return saved;
}
