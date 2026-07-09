import type { ExtensionSettings } from '@/shared/settings';

export const PROVIDER_IDS = [
  'openrouter',
  'gemini',
  'openai',
  'custom',
] as const;

export type ProviderId = typeof PROVIDER_IDS[number];

export type ProviderPreset = {
  id: ProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
  modelPlaceholder: string;
};

export const EXTENSION_TITLE = 'Page Translate';
export const OPENROUTER_REFERER = 'https://page-translate.extension';

export const PROVIDER_PRESETS: Record<ProviderId, ProviderPreset> = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-v4-flash',
    apiKeyPlaceholder: 'OpenRouter API key',
    modelPlaceholder: 'deepseek/deepseek-v4-flash',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    apiKeyPlaceholder: 'Gemini API key',
    modelPlaceholder: 'gemini-2.5-flash',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    apiKeyPlaceholder: 'OpenAI API key',
    modelPlaceholder: 'gpt-4o-mini',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    baseUrl: '',
    defaultModel: '',
    apiKeyPlaceholder: 'API key',
    modelPlaceholder: 'model-name',
  },
};

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && PROVIDER_IDS.includes(value as ProviderId);
}

export function getProviderPreset(provider: ProviderId): ProviderPreset {
  return PROVIDER_PRESETS[provider];
}

export function inferProviderFromBaseUrl(baseUrl: string): ProviderId {
  const normalized = baseUrl.toLowerCase();
  if (normalized.includes('openrouter.ai')) {
    return 'openrouter';
  }
  if (normalized.includes('generativelanguage.googleapis.com')) {
    return 'gemini';
  }
  if (normalized.includes('api.openai.com')) {
    return 'openai';
  }
  return 'custom';
}

export function resolveProvider(
  provider: unknown,
  baseUrl: string,
): ProviderId {
  if (isProviderId(provider)) {
    return provider;
  }
  return inferProviderFromBaseUrl(baseUrl);
}

export function buildRequestHeaders(
  settings: Pick<ExtensionSettings, 'apiKey' | 'provider'>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
  };

  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = OPENROUTER_REFERER;
    headers['X-Title'] = EXTENSION_TITLE;
  }

  return headers;
}
