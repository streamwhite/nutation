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
  'groq',
  'together',
  'fireworks',
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

const GEMINI_MODEL_ALIASES: Record<string, string> = {
  'gemini-3.1-flash-lite': GEMINI_DEFAULT_MODEL,
  'gemini-3.1-flash-lite-preview': GEMINI_DEFAULT_MODEL,
};

export const PROVIDER_PRESETS: Record<ProviderId, ProviderPreset> = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    category: 'gateway',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-v4-flash',
    modelPlaceholder: 'deepseek/deepseek-v4-flash',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    category: 'gateway',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    modelPlaceholder: 'llama-3.3-70b-versatile',
  },
  together: {
    id: 'together',
    label: 'Together AI',
    category: 'gateway',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    modelPlaceholder: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  },
  fireworks: {
    id: 'fireworks',
    label: 'Fireworks',
    category: 'gateway',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    modelPlaceholder: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
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
  if (normalized.includes('api.groq.com')) {
    return 'groq';
  }
  if (normalized.includes('api.together.xyz') || normalized.includes('together.xyz')) {
    return 'together';
  }
  if (normalized.includes('api.fireworks.ai')) {
    return 'fireworks';
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
  if (provider === 'gemini') {
    return normalizeGeminiModel(trimmed);
  }
  if (provider === 'openrouter' && !trimmed.includes('/') && trimmed.startsWith('gemini-')) {
    return `google/${normalizeGeminiModel(trimmed)}`;
  }
  return trimmed;
}

export function stripGeminiModelsPrefix(model: string): string {
  let normalized = model.trim();
  while (normalized.startsWith(GEMINI_MODELS_PREFIX)) {
    normalized = normalized.slice(GEMINI_MODELS_PREFIX.length);
  }
  return normalized;
}

export function normalizeGeminiModel(model: string): string {
  const withoutPrefix = stripGeminiModelsPrefix(model);
  return GEMINI_MODEL_ALIASES[withoutPrefix] ?? withoutPrefix;
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
