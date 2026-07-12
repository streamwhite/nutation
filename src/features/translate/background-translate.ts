import { TranslationRequestError } from '@/features/llm/retry';
import type { TextChunk, TranslateBatchResponse } from '@/features/translate/types';
import { MESSAGE_TYPES } from '@/shared/constants';
import type { ExtensionSettings } from '@/shared/settings';

export async function translateBatchViaBackground(
  settings: ExtensionSettings,
  texts: TextChunk[],
  targetLang: string,
): Promise<TextChunk[]> {
  if (texts.length === 0) {
    return [];
  }

  const response = await browser.runtime.sendMessage({
    type: MESSAGE_TYPES.TRANSLATE_BATCH,
    texts,
    targetLang,
    settings,
  }) as TranslateBatchResponse;

  if (!response.ok) {
    throw new TranslationRequestError(
      response.error,
      response.status ?? null,
      response.retryable ?? false,
    );
  }

  return response.translations;
}
