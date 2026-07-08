import { translateBatchWithOpenAI } from '@/features/llm/openai-compatible';
import {
  getCachedTranslation,
  setCachedTranslation,
} from '@/features/translate/cache';
import type {
  ExtensionMessage,
  TextChunk,
  TranslateBatchResponse,
} from '@/features/translate/types';
import { MESSAGE_TYPES } from '@/shared/constants';
import { loadSettings } from '@/shared/settings';

async function translateWithCache(
  texts: TextChunk[],
  targetLang: string,
): Promise<TextChunk[]> {
  const settings = await loadSettings();
  const missing: TextChunk[] = [];
  const translations: TextChunk[] = [];

  await Promise.all(texts.map(async (item) => {
    const cached = await getCachedTranslation(item.text, targetLang, settings.model);
    if (cached) {
      translations.push({ id: item.id, text: cached });
      return;
    }
    missing.push(item);
  }));

  if (missing.length > 0) {
    const fresh = await translateBatchWithOpenAI(settings, missing, targetLang);
    await Promise.all(fresh.map(async (item) => {
      const original = missing.find((entry) => entry.id === item.id);
      if (original) {
        await setCachedTranslation(original.text, targetLang, settings.model, item.text);
      }
      translations.push(item);
    }));
  }

  return translations;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type !== MESSAGE_TYPES.TRANSLATE_BATCH) {
      return undefined;
    }

    return translateWithCache(message.texts, message.targetLang)
      .then((translations): TranslateBatchResponse => ({
        ok: true,
        translations,
      }))
      .catch((error: unknown): TranslateBatchResponse => ({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }));
  });
});
