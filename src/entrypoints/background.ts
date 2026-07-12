import { registerContentScriptIfNeeded, recoverContentScript } from '@/features/content-script/recover';
import { warmGeminiConnection } from '@/features/llm/gemini-warm';
import { translateBatchWithOpenAI } from '@/features/llm/openai-compatible';
import { isRetryableError, TranslationRequestError, withRetries } from '@/features/llm/retry';
import { setCachedTranslations } from '@/features/translate/cache';
import {
  bindTranslateContextMenu,
  registerTranslateContextMenu,
} from '@/features/translate/context-menu';
import type {
  BackgroundMessage,
  EnsureContentScriptResponse,
  TranslateBatchResponse,
} from '@/features/translate/types';
import { MESSAGE_TYPES } from '@/shared/constants';

export default defineBackground(() => {
  // Register the top-level translate action first so it is available immediately.
  registerTranslateContextMenu();
  bindTranslateContextMenu();

  const ensureContentScript = () => registerContentScriptIfNeeded().catch((error: unknown) => {
    console.error('Failed to register content script', error);
  });

  void ensureContentScript();

  browser.runtime.onInstalled.addListener(() => {
    registerTranslateContextMenu();
    void ensureContentScript();
  });

  browser.runtime.onStartup.addListener(() => {
    registerTranslateContextMenu();
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

    if (message.type === MESSAGE_TYPES.WARM_PROVIDER) {
      return warmGeminiConnection(message.settings)
        .then(() => ({ ok: true }))
        .catch(() => ({ ok: false }));
    }

    if (message.type !== MESSAGE_TYPES.TRANSLATE_BATCH) {
      return undefined;
    }

    return withRetries(
      () => translateBatchWithOpenAI(message.settings, message.texts, message.targetLang),
    )
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
