const CHAT_COMPLETIONS_SUFFIX = '/chat/completions';
const GEMINI_HOST = 'generativelanguage.googleapis.com';

function stripChatCompletionsSuffix(baseUrl: string): string {
  let normalized = baseUrl.trim().replace(/\/+$/, '');
  const lower = normalized.toLowerCase();
  if (lower.endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    normalized = normalized.slice(0, -CHAT_COMPLETIONS_SUFFIX.length);
  } else if (lower.endsWith('/chat/completion')) {
    normalized = normalized.slice(0, -'/chat/completion'.length);
  }
  return normalized.replace(/\/+$/, '');
}

function normalizeGeminiBaseUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return baseUrl;
  }

  if (parsed.hostname !== GEMINI_HOST) {
    return baseUrl;
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  if (path.includes('/openai')) {
    const openAiRoot = path.split('/openai')[0];
    return `${parsed.origin}${openAiRoot}/openai`;
  }

  if (path.includes('/models/')) {
    const version = path.match(/^\/(v1beta|v1)/)?.[1] ?? 'v1beta';
    return `${parsed.origin}/${version}/openai`;
  }

  const version = path.match(/^\/(v1beta|v1)$/)?.[1];
  if (version) {
    return `${parsed.origin}/${version}/openai`;
  }

  if (path === '') {
    return `${parsed.origin}/v1beta/openai`;
  }

  return baseUrl;
}

export function normalizeApiBaseUrl(baseUrl: string): string {
  const geminiNormalized = normalizeGeminiBaseUrl(baseUrl);
  return stripChatCompletionsSuffix(geminiNormalized);
}

export function normalizeCustomChatCompletionsUrl(apiUrl: string): string {
  const trimmed = apiUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  const lower = trimmed.toLowerCase();
  if (lower.endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    return trimmed;
  }
  if (lower.endsWith('/chat/completion')) {
    return `${trimmed.slice(0, -'/chat/completion'.length)}${CHAT_COMPLETIONS_SUFFIX}`;
  }
  return `${trimmed}${CHAT_COMPLETIONS_SUFFIX}`;
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (trimmed.toLowerCase().endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    return trimmed;
  }
  return `${normalizeApiBaseUrl(baseUrl)}${CHAT_COMPLETIONS_SUFFIX}`;
}

export function buildGeminiApiRoot(baseUrl: string): string {
  const normalized = stripChatCompletionsSuffix(baseUrl.trim());
  try {
    const parsed = new URL(normalized);
    if (parsed.hostname !== GEMINI_HOST) {
      return `https://${GEMINI_HOST}/v1beta`;
    }

    const path = parsed.pathname
      .replace(/\/openai\/?$/, '')
      .replace(/\/models\/.*$/, '')
      .replace(/\/+$/, '');
    const version = path.match(/^\/(v1beta|v1)$/)?.[1] ?? 'v1beta';
    return `${parsed.origin}/${version}`;
  } catch {
    return `https://${GEMINI_HOST}/v1beta`;
  }
}

export function buildGeminiGenerateContentUrl(baseUrl: string, model: string): string {
  const root = buildGeminiApiRoot(baseUrl);
  return `${root}/models/${encodeURIComponent(model)}:generateContent`;
}

export function buildGeminiInteractionsUrl(baseUrl: string): string {
  return `${buildGeminiApiRoot(baseUrl)}/interactions`;
}
