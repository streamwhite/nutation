import { registerContentScriptIfNeeded, recoverContentScript } from '@/features/content-script/recover';
import { translateBatchWithOpenAI } from '@/features/llm/openai-compatible';
import { isRetryableError, TranslationRequestError, withRetries } from '@/features/llm/retry';
import {
  getCachedTranslations,
  setCachedTranslations,
} from '@/features/translate/cache';
import { getCachedSettings, primeSettingsCache } from '@/features/translate/settings-cache';
import { normalizeCacheText } from '@/features/translate/text-normalize';
import type {
  BackgroundMessage,
  EnsureContentScriptResponse,
  TextChunk,
  TranslateBatchResponse,
} from '@/features/translate/types';
import { MESSAGE_TYPES } from '@/shared/constants';

async function translateWithCache(
  texts: TextChunk[],
  targetLang: string,
): Promise<TextChunk[]> {
  const settings = await getCachedSettings();
  const translations: TextChunk[] = [];
  const uniqueMissing: TextChunk[] = [];
  const expand = new Map<string, string[]>();
  const firstIdByText = new Map<string, string>();

  const normalizedTexts = texts.map((item) => normalizeCacheText(item.text));
  const cachedByText = await getCachedTranslations(
    normalizedTexts,
    targetLang,
    settings.model,
  );

  for (const item of texts) {
    const normalized = normalizeCacheText(item.text);
    const cached = cachedByText.get(normalized);
    if (cached) {
      translations.push({ id: item.id, text: cached });
      continue;
    }

    const existingId = firstIdByText.get(normalized);
    if (existingId) {
      const ids = expand.get(existingId);
      ids?.push(item.id);
      continue;
    }

    firstIdByText.set(normalized, item.id);
    expand.set(item.id, [item.id]);
    uniqueMissing.push({ id: item.id, text: normalized });
  }

  if (uniqueMissing.length === 0) {
    return translations;
  }

  const fresh = await withRetries(
    () => translateBatchWithOpenAI(settings, uniqueMissing, targetLang),
  );
  const freshById = new Map(fresh.map((item) => [item.id, item.text]));
  const cacheEntries = uniqueMissing.flatMap((item) => {
    const translation = freshById.get(item.id);
    return translation ? [{ text: item.text, translation }] : [];
  });

  setCachedTranslations(cacheEntries, targetLang, settings.model);

  for (const item of fresh) {
    const ids = expand.get(item.id) ?? [item.id];
    for (const id of ids) {
      translations.push({ id, text: item.text });
    }
  }

  return translations;
}

export default defineBackground(() => {
  primeSettingsCache();

  void registerContentScriptIfNeeded().catch((error: unknown) => {
    console.error('Failed to register content script', error);
  });

  browser.runtime.onInstalled.addListener(() => {
    void registerContentScriptIfNeeded().catch((error: unknown) => {
      console.error('Failed to register content script on install', error);
    });
  });

  browser.runtime.onMessage.addListener((message: BackgroundMessage) => {
    if (message.type === MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT) {
      return recoverContentScript(message.tabId)
        .then((result): EnsureContentScriptResponse => result)
        .catch((error: unknown): EnsureContentScriptResponse => ({
          ok: false,
          recovered: false,
          error: error instanceof Error ? error.message : String(error),
        }));
    }

    if (message.type === MESSAGE_TYPES.PERSIST_TRANSLATIONS) {
      setCachedTranslations(message.entries, message.targetLang, message.model);
      return Promise.resolve({ ok: true });
    }

    if (message.type !== MESSAGE_TYPES.TRANSLATE_BATCH) {
      return undefined;
    }

    return translateWithCache(message.texts, message.targetLang)
      .then((translations): TranslateBatchResponse => ({
        ok: true,
        translations,
      }))
      .catch((error: unknown): TranslateBatchResponse => {
        if (error instanceof TranslationRequestError) {
          return {
            ok: false,
            error: error.message,
            retryable: error.retryable,
            status: error.status,
          };
        }
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          retryable: isRetryableError(error),
        };
      });
  });
});
