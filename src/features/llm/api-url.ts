const CHAT_COMPLETIONS_SUFFIX = '/chat/completions';

export function normalizeApiBaseUrl(baseUrl: string): string {
  let normalized = baseUrl.trim().replace(/\/+$/, '');
  if (normalized.toLowerCase().endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    normalized = normalized.slice(0, -CHAT_COMPLETIONS_SUFFIX.length);
  }
  return normalized.replace(/\/+$/, '');
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  return `${normalizeApiBaseUrl(baseUrl)}${CHAT_COMPLETIONS_SUFFIX}`;
}
