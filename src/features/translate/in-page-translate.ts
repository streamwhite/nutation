import { translateBatchWithOpenAI } from '@/features/llm/openai-compatible';
import { isRetryableError, TranslationRequestError, withRetries } from '@/features/llm/retry';
import { buildCacheKey } from '@/features/translate/cache-key';
import { normalizeCacheText } from '@/features/translate/text-normalize';
import type { StageTimer } from '@/features/translate/stage-timer';
import type { TextChunk } from '@/features/translate/types';
import { MESSAGE_TYPES } from '@/shared/constants';
import type { ExtensionSettings } from '@/shared/settings';

export type InPageTranslateResult = {
  translations: TextChunk[];
  fromCache: number;
  fromApi: number;
};

export class InPageTranslator {
  private readonly sessionCache = new Map<string, string>();

  constructor(
    private readonly settings: ExtensionSettings,
    private readonly targetLang: string,
    private readonly timing: StageTimer,
  ) {}

  async translate(batch: TextChunk[]): Promise<InPageTranslateResult> {
    const hits: TextChunk[] = [];
    const missing: TextChunk[] = [];

    for (const item of batch) {
      const normalized = normalizeCacheText(item.text);
      const key = buildCacheKey(normalized, this.targetLang, this.settings.model);
      const cached = this.sessionCache.get(key);
      if (cached) {
        hits.push({ id: item.id, text: cached });
        continue;
      }
      missing.push({ id: item.id, text: normalized });
    }

    if (missing.length === 0) {
      this.timing.record('cache_hit', 0);
      return { translations: hits, fromCache: hits.length, fromApi: 0 };
    }

    let fresh: TextChunk[] = [];
    this.timing.start('api_request');
    try {
      fresh = await withRetries(
        () => translateBatchWithOpenAI(this.settings, missing, this.targetLang),
      );
    } catch (error) {
      if (error instanceof TranslationRequestError) {
        throw Object.assign(error, { retryable: error.retryable });
      }
      throw Object.assign(
        error instanceof Error ? error : new Error(String(error)),
        { retryable: isRetryableError(error) },
      );
    } finally {
      this.timing.end('api_request');
    }

    const entries: Array<{ text: string; translation: string }> = [];
    for (const item of fresh) {
      const source = missing.find((entry) => entry.id === item.id);
      if (!source) {
        continue;
      }
      const key = buildCacheKey(source.text, this.targetLang, this.settings.model);
      this.sessionCache.set(key, item.text);
      entries.push({ text: source.text, translation: item.text });
    }

    if (entries.length > 0) {
      void browser.runtime.sendMessage({
        type: MESSAGE_TYPES.PERSIST_TRANSLATIONS,
        entries,
        targetLang: this.targetLang,
        model: this.settings.model,
      }).catch((error: unknown) => {
        console.warn('Failed to persist translations', error);
      });
    }

    return {
      translations: [...hits, ...fresh],
      fromCache: hits.length,
      fromApi: fresh.length,
    };
  }
}
