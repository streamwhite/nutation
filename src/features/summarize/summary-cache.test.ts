import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, unknown>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        set: vi.fn(async (value: Record<string, unknown>) => {
          for (const [key, entry] of Object.entries(value)) {
            storage.set(key, entry);
          }
        }),
        get: vi.fn(async (key: string | null) => {
          if (key === null) {
            return Object.fromEntries(storage.entries());
          }
          return { [key]: storage.get(key) };
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            storage.delete(key);
          }
        }),
      },
    },
  },
}));

const {
  buildSummaryCacheKey,
  clearSummaryCache,
  getCachedSummary,
  normalizePageCacheUrl,
  setCachedSummary,
} = await import('@/features/summarize/summary-cache');

describe('normalizePageCacheUrl', () => {
  it('strips hash and trailing slash for the same page', () => {
    expect(normalizePageCacheUrl('https://Example.com/post/1/#comments')).toBe(
      'https://example.com/post/1',
    );
    expect(normalizePageCacheUrl('https://example.com/post/1')).toBe(
      'https://example.com/post/1',
    );
  });
});

describe('buildSummaryCacheKey', () => {
  it('keys by model, target lang, and page url (not body text)', () => {
    const url = 'https://example.com/article/42';
    const a = buildSummaryCacheKey(url, 'zh-CN', 'gpt-4o-mini');
    const b = buildSummaryCacheKey(`${url}#section`, 'zh-CN', 'gpt-4o-mini');
    const c = buildSummaryCacheKey(url, 'en', 'gpt-4o-mini');
    const d = buildSummaryCacheKey('https://example.com/article/99', 'zh-CN', 'gpt-4o-mini');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
    expect(a).toContain('gpt-4o-mini');
    expect(a).toContain('zh-CN');
  });
});

describe('summary cache', () => {
  beforeEach(async () => {
    storage.clear();
    await clearSummaryCache();
  });

  it('returns cached summary on second lookup for same page url', async () => {
    const pageUrl = 'https://example.com/cache-hit';
    const targetLang = 'zh-CN';
    const model = 'openai/gpt-4o-mini';

    expect(await getCachedSummary(pageUrl, targetLang, model)).toBeNull();

    await setCachedSummary(pageUrl, targetLang, model, '缓存摘要内容');

    expect(await getCachedSummary(pageUrl, targetLang, model)).toBe('缓存摘要内容');
    expect(await getCachedSummary(`${pageUrl}#top`, targetLang, model)).toBe('缓存摘要内容');
  });

  it('misses when model or language differs', async () => {
    const pageUrl = 'https://example.com/lang-model';
    await setCachedSummary(pageUrl, 'zh-CN', 'model-a', '摘要 A');

    expect(await getCachedSummary(pageUrl, 'en', 'model-a')).toBeNull();
    expect(await getCachedSummary(pageUrl, 'zh-CN', 'model-b')).toBeNull();
  });

  it('reads from browser.storage when memory is cold', async () => {
    const pageUrl = 'https://example.com/persist';
    const model = 'model-a';
    const targetLang = 'zh-CN';
    storage.set(
      `summary-cache:${buildSummaryCacheKey(pageUrl, targetLang, model)}`,
      { summary: '持久摘要', usedAt: Date.now() },
    );

    expect(await getCachedSummary(pageUrl, targetLang, model)).toBe('持久摘要');
  });
});
