import { createGeminiClient, mapGeminiClientError, type GeminiClient } from '@/features/llm/gemini-client';
import { ensureCompleteTranslations } from '@/features/llm/ensure-complete';
import { parseTranslationContent } from '@/features/llm/translation-content';
import { TRANSLATION_RESPONSE_FORMAT } from '@/features/llm/translation-schema';
import {
  buildTranslationUserPrompt,
  estimateMaxTokens,
  getTranslationSystemPrompt,
} from '@/features/llm/request-body';
import { TranslationRequestError } from '@/features/llm/retry';
import type { TextChunk } from '@/features/translate/types';
import { API_KEY_MISSING_MESSAGE } from '@/shared/api-key';
import {
  GEMINI_PRO_MODEL_PATTERN,
  GEMINI_PRO_THINKING_LEVEL,
  GEMINI_THINKING_LEVEL,
} from '@/shared/constants';
import { inferProviderFromBaseUrl, resolveRequestModel } from '@/shared/providers';
import type { ExtensionSettings } from '@/shared/settings';

export function isGeminiProvider(
  settings: Pick<ExtensionSettings, 'provider' | 'baseUrl'>,
): boolean {
  return settings.provider === 'gemini'
    || inferProviderFromBaseUrl(settings.baseUrl) === 'gemini';
}

function resolveModel(settings: ExtensionSettings): string {
  return resolveRequestModel(settings);
}

export function resolveGeminiThinkingLevel(
  model: string,
): typeof GEMINI_THINKING_LEVEL | typeof GEMINI_PRO_THINKING_LEVEL {
  return GEMINI_PRO_MODEL_PATTERN.test(model)
    ? GEMINI_PRO_THINKING_LEVEL
    : GEMINI_THINKING_LEVEL;
}

async function requestGeminiBatch(
  settings: ExtensionSettings,
  texts: TextChunk[],
  targetLang: string,
  clientFactory: (apiKey: string, baseUrl: string) => GeminiClient,
): Promise<TextChunk[]> {
  const model = resolveModel(settings);
  const client = clientFactory(settings.apiKey, settings.baseUrl);

  try {
    const response = await client.createInteraction({
      model,
      input: buildTranslationUserPrompt(texts, targetLang),
      system_instruction: getTranslationSystemPrompt(),
      response_format: { ...TRANSLATION_RESPONSE_FORMAT },
      generation_config: {
        temperature: 0,
        max_output_tokens: estimateMaxTokens(texts),
        thinking_level: resolveGeminiThinkingLevel(model),
      },
    });

    const content = response.output_text?.trim();
    if (!content) {
      throw new Error('Empty model response');
    }

    return parseTranslationContent(content);
  } catch (error) {
    if (error instanceof TranslationRequestError) {
      throw error;
    }

    const { message, status, retryable } = mapGeminiClientError(error);
    const parseFailure = /not valid line or JSON|Unable to parse translation JSON|Empty model response/i
      .test(message);
    throw new TranslationRequestError(
      `${message} (model: ${model})`,
      status,
      retryable || parseFailure,
    );
  }
}

export async function translateBatchWithGeminiNative(
  settings: ExtensionSettings,
  texts: TextChunk[],
  targetLang: string,
  clientFactory: (apiKey: string, baseUrl: string) => GeminiClient = createGeminiClient,
): Promise<TextChunk[]> {
  if (texts.length === 0) {
    return [];
  }

  if (!settings.apiKey.trim()) {
    throw new Error(API_KEY_MISSING_MESSAGE);
  }

  return ensureCompleteTranslations(
    texts,
    (batch) => requestGeminiBatch(settings, batch, targetLang, clientFactory),
  );
}
