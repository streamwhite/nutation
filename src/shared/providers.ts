import type { ExtensionSettings } from '@/shared/settings';
import { normalizeCustomChatCompletionsUrl } from '@/features/llm/api-url';

export const PROVIDER_CATEGORIES = ['gateway', 'direct'] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  gateway: 'API gateways',
  direct: 'Direct providers',
};

export const PROVIDER_IDS = [
  'openrouter',
  'vercel',
  'openai',
  'gemini',
  'deepseek',
  'mistral',
  'custom',
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type ProviderPreset = {
  id: ProviderId;
  label: string;
  category: ProviderCategory;
  baseUrl: string;
  defaultModel: string;
  modelPlaceholder: string;
};

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite';
export const GEMINI_MODELS_PREFIX = 'models/';

function isBareGeminiModelId(model: string): boolean {
  return model.startsWith('gemini-') || model.startsWith('gemma-');
}

function stripGoogleProviderPrefix(model: string): string {
  return model.startsWith('google/') ? model.slice('google/'.length) : model;
}

export const PROVIDER_PRESETS: Record<ProviderId, ProviderPreset> = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    category: 'gateway',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-v4-flash',
    modelPlaceholder: 'deepseek/deepseek-v4-flash',
  },
  vercel: {
    id: 'vercel',
    label: 'Vercel AI Gateway',
    category: 'gateway',
    baseUrl: 'https://ai-gateway.vercel.sh/v1',
    defaultModel: 'google/gemini-3.1-flash-lite',
    modelPlaceholder: 'google/gemini-3.1-flash-lite',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    category: 'direct',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    modelPlaceholder: 'gpt-4o-mini',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    category: 'direct',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: GEMINI_DEFAULT_MODEL,
    modelPlaceholder: GEMINI_DEFAULT_MODEL,
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    category: 'direct',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-flash',
    modelPlaceholder: 'deepseek-v4-flash',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    category: 'direct',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    modelPlaceholder: 'mistral-small-latest',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    category: 'direct',
    baseUrl: '',
    defaultModel: '',
    modelPlaceholder: 'model-name',
  },
};

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && PROVIDER_IDS.includes(value as ProviderId);
}

export function getProviderPreset(provider: ProviderId): ProviderPreset {
  return PROVIDER_PRESETS[provider];
}

export function resolveProviderBaseUrl(
  provider: ProviderId,
  customBaseUrl = '',
): string {
  if (provider === 'custom') {
    return normalizeCustomChatCompletionsUrl(customBaseUrl);
  }
  return PROVIDER_PRESETS[provider].baseUrl;
}

export function listProvidersByCategory(category: ProviderCategory): ProviderPreset[] {
  return PROVIDER_IDS
    .map((id) => PROVIDER_PRESETS[id])
    .filter((preset) => preset.category === category);
}

export function inferProviderFromBaseUrl(baseUrl: string): ProviderId {
  const normalized = baseUrl.toLowerCase();
  if (normalized.includes('openrouter.ai')) {
    return 'openrouter';
  }
  if (normalized.includes('ai-gateway.vercel.sh')) {
    return 'vercel';
  }
  if (normalized.includes('generativelanguage.googleapis.com')) {
    return 'gemini';
  }
  if (normalized.includes('api.openai.com')) {
    return 'openai';
  }
  if (normalized.includes('api.deepseek.com')) {
    return 'deepseek';
  }
  if (normalized.includes('api.mistral.ai')) {
    return 'mistral';
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

export function normalizeModelName(provider: ProviderId, model: string): string {
  const trimmed = model.trim();
  const geminiBare = normalizeGeminiModel(trimmed);

  if (provider === 'gemini') {
    return geminiBare;
  }

  if (provider === 'openrouter') {
    if (trimmed.startsWith('google/')) {
      return `google/${normalizeGeminiModel(trimmed.slice('google/'.length))}`;
    }
    if (isBareGeminiModelId(geminiBare)) {
      return `google/${geminiBare}`;
    }
    return trimmed;
  }

  if (isBareGeminiModelId(geminiBare)) {
    return geminiBare;
  }

  return trimmed;
}

export function resolveRequestModel(
  settings: Pick<ExtensionSettings, 'provider' | 'baseUrl' | 'model'>,
): string {
  if (settings.provider === 'gemini'
    || inferProviderFromBaseUrl(settings.baseUrl) === 'gemini') {
    return normalizeGeminiModel(settings.model);
  }
  return normalizeModelName(settings.provider, settings.model);
}

export function stripGeminiModelsPrefix(model: string): string {
  let normalized = stripGoogleProviderPrefix(model.trim());
  while (normalized.startsWith(GEMINI_MODELS_PREFIX)) {
    normalized = normalized.slice(GEMINI_MODELS_PREFIX.length);
  }
  return normalized;
}

export function normalizeGeminiModel(model: string): string {
  return stripGeminiModelsPrefix(model);
}

export function toGeminiInteractionModelId(model: string): string {
  return normalizeGeminiModel(model);
}

export const EXTENSION_TITLE = 'Page Translate';
export const OPENROUTER_REFERER = 'https://page-translate.extension';

export function buildRequestHeaders(
  settings: Pick<ExtensionSettings, 'apiKey' | 'provider'>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
  };

  if (settings.provider === 'gemini') {
    headers['x-goog-api-key'] = settings.apiKey;
  }

  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = OPENROUTER_REFERER;
    headers['X-Title'] = EXTENSION_TITLE;
  }

  return headers;
}
