import { buildGeminiApiRoot } from '@/features/llm/api-url';
import { mapGeminiClientError } from '@/features/llm/gemini-client';
import { isGeminiProvider } from '@/features/llm/gemini-native';
import type { ExtensionSettings } from '@/shared/settings';

const warmInFlight = new Map<string, Promise<void>>();

function warmKey(settings: ExtensionSettings): string {
  return `${settings.baseUrl}|${settings.apiKey}`;
}

export async function warmGeminiConnection(
  settings: ExtensionSettings,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!isGeminiProvider(settings) || !settings.apiKey.trim()) {
    return;
  }

  const key = warmKey(settings);
  const existing = warmInFlight.get(key);
  if (existing) {
    return existing;
  }

  const endpoint = buildGeminiApiRoot(settings.baseUrl);
  const task = fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      'x-goog-api-key': settings.apiKey,
    },
  })
    .then(() => undefined)
    .catch((error: unknown) => {
      console.warn('Gemini connection warm failed', mapGeminiClientError(error).message);
    })
    .finally(() => {
      warmInFlight.delete(key);
    });

  warmInFlight.set(key, task);
  return task;
}
