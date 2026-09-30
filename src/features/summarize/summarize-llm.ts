import { extractApiErrorMessage } from '@/features/llm/api-error';
import { buildChatCompletionsUrl } from '@/features/llm/api-url';
import { TranslationRequestError } from '@/features/llm/retry';
import { buildSummarizeChatBody } from '@/features/summarize/summarize-request';
import {
  getCachedSummary,
  setCachedSummary,
} from '@/features/summarize/summary-cache';
import { RETRYABLE_HTTP_STATUSES } from '@/shared/constants';
import { API_KEY_MISSING_MESSAGE } from '@/shared/api-key';
import { buildRequestHeaders, resolveRequestModel } from '@/shared/providers';
import { DEFAULT_LOCALE, formatMessage } from '@/i18n';
import type { ExtensionSettings } from '@/shared/settings';

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

export type SummarizeLlmResult = {
  summary: string;
  fromCache: boolean;
};

export async function summarizePageTextWithLlm(
  settings: ExtensionSettings,
  pageText: string,
  targetLang: string,
  pageUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SummarizeLlmResult> {
  if (!settings.apiKey.trim()) {
    throw new Error(API_KEY_MISSING_MESSAGE);
  }
  if (!pageText.trim()) {
    throw new Error(formatMessage(DEFAULT_LOCALE, 'summarize.emptyPage'));
  }

  const model = resolveRequestModel(settings);
  const cached = await getCachedSummary(pageUrl, targetLang, model);
  if (cached) {
    return { summary: cached, fromCache: true };
  }

  const endpoint = buildChatCompletionsUrl(settings.baseUrl);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildRequestHeaders(settings),
    body: JSON.stringify(buildSummarizeChatBody(settings, pageText, targetLang)),
  });

  const payload = await response.json() as ChatCompletionResponse;
  if (!response.ok) {
    const detail = extractApiErrorMessage(payload, response.status);
    const message = `${detail} (model: ${model}, endpoint: ${endpoint})`;
    const retryable = RETRYABLE_HTTP_STATUSES.includes(
      response.status as typeof RETRYABLE_HTTP_STATUSES[number],
    );
    throw new TranslationRequestError(message, response.status, retryable);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(formatMessage(DEFAULT_LOCALE, 'summarize.emptyResponse'));
  }
  await setCachedSummary(pageUrl, targetLang, model, content);
  return { summary: content, fromCache: false };
}
