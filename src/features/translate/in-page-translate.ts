import { getCachedTranslations, setCachedTranslations } from '@/features/translate/cache';
import { translateBatchWithOpenAI } from '@/features/llm/openai-compatible';
import { isGeminiProvider } from '@/features/llm/gemini-native';
import { isRetryableError, TranslationRequestError, withRetries } from '@/features/llm/retry';
import { convertBatchWithOpenCC, getOpenCCCacheModel } from '@/features/opencc/convert';
import { shouldUseOpenCC } from '@/features/opencc/locale';
import { translateBatchViaBackground } from '@/features/translate/background-translate';
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

export type CacheHitStats = {
  hits: number;
  lookups: number;
};

function cacheModelFor(item: TextChunk, targetLang: string, model: string): string {
  return shouldUseOpenCC(item.text, targetLang, item.sourceLang)
    ? getOpenCCCacheModel()
    : model;
}

export class InPageTranslator {
  private readonly sessionCache = new Map<string, string>();
  private readonly inflight = new Map<string, Promise<string>>();
  private warmed = false;
  private cacheHits = 0;
  private cacheLookups = 0;

  constructor(
    private readonly settings: ExtensionSettings,
    private readonly targetLang: string,
    private readonly timing: StageTimer,
  ) {}

  getCacheStats(): CacheHitStats {
    return {
      hits: this.cacheHits,
      lookups: this.cacheLookups,
    };
  }

  warmProvider(): void {
    if (this.warmed || !isGeminiProvider(this.settings)) {
      return;
    }
    this.warmed = true;
    void browser.runtime.sendMessage({
      type: MESSAGE_TYPES.WARM_PROVIDER,
      settings: this.settings,
    }).catch((error: unknown) => {
      console.warn('Failed to warm translation provider', error);
    });
  }

  async translate(batch: TextChunk[]): Promise<InPageTranslateResult> {
    const hits: TextChunk[] = [];
    const missing: TextChunk[] = [];

    for (const item of batch) {
      const normalized = normalizeCacheText(item.text);
      const next: TextChunk = item.sourceLang
        ? { id: item.id, text: normalized, sourceLang: item.sourceLang }
        : { id: item.id, text: normalized };
      const model = cacheModelFor(next, this.targetLang, this.settings.model);
      const key = buildCacheKey(normalized, this.targetLang, model);
      this.cacheLookups += 1;
      const cached = this.sessionCache.get(key);
      if (cached) {
        this.cacheHits += 1;
        hits.push({ id: item.id, text: cached });
        continue;
      }
      missing.push(next);
    }

    if (missing.length > 0) {
      await this.hydrateFromStore(missing, hits);
    }

    if (missing.length === 0) {
      this.timing.record('cache_hit', 0);
      return { translations: hits, fromCache: hits.length, fromApi: 0 };
    }

    const localItems = missing.filter((item) => (
      shouldUseOpenCC(item.text, this.targetLang, item.sourceLang)
    ));
    const remoteItems = missing.filter((item) => (
      !shouldUseOpenCC(item.text, this.targetLang, item.sourceLang)
    ));

    const fresh: TextChunk[] = [];

    if (localItems.length > 0) {
      this.timing.start('opencc_convert');
      try {
        const converted = await this.resolveItems(localItems, async (items) => (
          convertBatchWithOpenCC(items)
        ));
        fresh.push(...converted);
      } finally {
        this.timing.end('opencc_convert');
      }
    }

    if (remoteItems.length > 0) {
      this.timing.start('api_request');
      try {
        const remote = await this.resolveItems(remoteItems, async (items) => (
          withRetries(() => (
            isGeminiProvider(this.settings)
              ? translateBatchViaBackground(this.settings, items, this.targetLang)
              : translateBatchWithOpenAI(this.settings, items, this.targetLang)
          ))
        ));
        fresh.push(...remote);
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
    }

    return {
      translations: [...hits, ...fresh],
      fromCache: hits.length,
      fromApi: remoteItems.length,
    };
  }

  private async hydrateFromStore(
    missing: TextChunk[],
    hits: TextChunk[],
  ): Promise<void> {
    const byModel = new Map<string, TextChunk[]>();
    for (const item of missing) {
      const model = cacheModelFor(item, this.targetLang, this.settings.model);
      const group = byModel.get(model) ?? [];
      group.push(item);
      byModel.set(model, group);
    }

    const stillMissing: TextChunk[] = [];
    for (const [model, items] of byModel) {
      const cached = await getCachedTranslations(
        items.map((item) => item.text),
        this.targetLang,
        model,
      );
      for (const item of items) {
        const hit = cached.get(item.text);
        if (!hit) {
          stillMissing.push(item);
          continue;
        }
        this.cacheHits += 1;
        this.sessionCache.set(
          buildCacheKey(item.text, this.targetLang, model),
          hit,
        );
        hits.push({ id: item.id, text: hit });
      }
    }

    missing.length = 0;
    missing.push(...stillMissing);
  }

  private async resolveItems(
    items: TextChunk[],
    translate: (items: TextChunk[]) => Promise<TextChunk[]>,
  ): Promise<TextChunk[]> {
    const results: TextChunk[] = [];
    const toFetch: TextChunk[] = [];
    const waiters: Array<Promise<TextChunk>> = [];

    for (const item of items) {
      const model = cacheModelFor(item, this.targetLang, this.settings.model);
      const key = buildCacheKey(item.text, this.targetLang, model);
      const sessionHit = this.sessionCache.get(key);
      if (sessionHit) {
        this.cacheHits += 1;
        results.push({ id: item.id, text: sessionHit });
        continue;
      }

      const pending = this.inflight.get(key);
      if (pending) {
        this.cacheHits += 1;
        waiters.push(pending.then((text) => ({ id: item.id, text })));
        continue;
      }

      toFetch.push(item);
    }

    if (toFetch.length > 0) {
      const uniqueFetch: TextChunk[] = [];
      const expand = new Map<string, string[]>();
      const firstIdByKey = new Map<string, string>();

      for (const item of toFetch) {
        const model = cacheModelFor(item, this.targetLang, this.settings.model);
        const key = buildCacheKey(item.text, this.targetLang, model);
        const existingId = firstIdByKey.get(key);
        if (!existingId) {
          firstIdByKey.set(key, item.id);
          uniqueFetch.push(item);
          expand.set(item.id, [item.id]);
          continue;
        }
        const ids = expand.get(existingId);
        if (ids) {
          ids.push(item.id);
        }
      }

      const fetchPromise = translate(uniqueFetch).then((translations) => {
        const byId = new Map(translations.map((item) => [item.id, item.text]));
        const entries: Array<{ text: string; translation: string; model: string }> = [];

        for (const item of uniqueFetch) {
          const text = byId.get(item.id);
          if (typeof text !== 'string') {
            continue;
          }
          const model = cacheModelFor(item, this.targetLang, this.settings.model);
          const key = buildCacheKey(item.text, this.targetLang, model);
          this.sessionCache.set(key, text);
          this.inflight.delete(key);
          entries.push({ text: item.text, translation: text, model });
        }

        this.persistEntries(entries);
        return translations;
      }).catch((error: unknown) => {
        for (const item of uniqueFetch) {
          const model = cacheModelFor(item, this.targetLang, this.settings.model);
          const key = buildCacheKey(item.text, this.targetLang, model);
          this.inflight.delete(key);
        }
        throw error;
      });

      for (const item of uniqueFetch) {
        const model = cacheModelFor(item, this.targetLang, this.settings.model);
        const key = buildCacheKey(item.text, this.targetLang, model);
        this.inflight.set(key, fetchPromise.then((translations) => {
          const match = translations.find((entry) => entry.id === item.id);
          if (!match) {
            throw new Error(`Missing translation for ${item.id}`);
          }
          return match.text;
        }));
      }

      const translations = await fetchPromise;
      const byId = new Map(translations.map((item) => [item.id, item.text]));
      for (const item of uniqueFetch) {
        const text = byId.get(item.id);
        if (typeof text !== 'string') {
          continue;
        }
        const ids = expand.get(item.id) ?? [item.id];
        for (const id of ids) {
          results.push({ id, text });
        }
      }
    }

    if (waiters.length > 0) {
      results.push(...await Promise.all(waiters));
    }

    return results;
  }

  private persistEntries(
    entries: Array<{ text: string; translation: string; model: string }>,
  ): void {
    if (entries.length === 0) {
      return;
    }

    const byModel = new Map<string, Array<{ text: string; translation: string }>>();
    for (const entry of entries) {
      const group = byModel.get(entry.model) ?? [];
      group.push({ text: entry.text, translation: entry.translation });
      byModel.set(entry.model, group);
    }

    for (const [model, group] of byModel) {
      setCachedTranslations(group, this.targetLang, model);
      void browser.runtime.sendMessage({
        type: MESSAGE_TYPES.PERSIST_TRANSLATIONS,
        entries: group,
        targetLang: this.targetLang,
        model,
      }).catch((error: unknown) => {
        console.warn('Failed to persist translations', error);
      });
    }
  }
}
