import { extractApiErrorMessage } from '@/features/llm/api-error';
import { ensureCompleteTranslations } from '@/features/llm/ensure-complete';
import { translateBatchWithGeminiNative, isGeminiProvider } from '@/features/llm/gemini-native';
import { TranslationRequestError } from '@/features/llm/retry';
import { buildChatCompletionsUrl } from '@/features/llm/api-url';
import { buildChatCompletionBody } from '@/features/llm/request-body';
import { parseTranslationContent } from '@/features/llm/translation-content';
import type { TextChunk } from '@/features/translate/types';
import { RETRYABLE_HTTP_STATUSES } from '@/shared/constants';
import { API_KEY_MISSING_MESSAGE } from '@/shared/api-key';
import { buildRequestHeaders, resolveRequestModel } from '@/shared/providers';
import type { ExtensionSettings } from '@/shared/settings';

export { estimateMaxTokens } from '@/features/llm/request-body';
export { parseTranslationContent } from '@/features/llm/translation-content';

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

async function requestOpenAiBatch(
  settings: ExtensionSettings,
  texts: TextChunk[],
  targetLang: string,
  fetchImpl: typeof fetch,
): Promise<TextChunk[]> {
  const endpoint = buildChatCompletionsUrl(settings.baseUrl);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildRequestHeaders(settings),
    body: JSON.stringify(buildChatCompletionBody(settings, texts, targetLang)),
  });

  const payload = await response.json() as ChatCompletionResponse;
  if (!response.ok) {
    const detail = extractApiErrorMessage(payload, response.status);
    const message = `${detail} (model: ${resolveRequestModel(settings)}, endpoint: ${endpoint})`;
    const retryable = RETRYABLE_HTTP_STATUSES.includes(
      response.status as typeof RETRYABLE_HTTP_STATUSES[number],
    );
    throw new TranslationRequestError(
      message,
      response.status,
      retryable,
    );
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty model response');
  }

  return parseTranslationContent(content);
}

export async function translateBatchWithOpenAI(
  settings: ExtensionSettings,
  texts: TextChunk[],
  targetLang: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TextChunk[]> {
  if (texts.length === 0) {
    return [];
  }

  if (!settings.apiKey.trim()) {
    throw new Error(API_KEY_MISSING_MESSAGE);
  }

  if (isGeminiProvider(settings)) {
    return translateBatchWithGeminiNative(settings, texts, targetLang);
  }

  return ensureCompleteTranslations(
    texts,
    (batch) => requestOpenAiBatch(settings, batch, targetLang, fetchImpl),
  );
}
