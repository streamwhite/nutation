import { describe, expect, it, beforeEach, vi } from 'vitest';

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

const { clearSummaryCache } = await import('@/features/summarize/summary-cache');
const { summarizePageTextWithLlm } = await import('@/features/summarize/summarize-llm');
import type { ExtensionSettings } from '@/shared/settings';

const settings: ExtensionSettings = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'test-key',
  allowChinaDataTransfer: false,
  model: 'openai/gpt-4o-mini',
  targetLang: 'zh-CN',
  autoRecoverContentScript: true,
  translationMode: 'bulk',
  translateOnOpen: true,
  translateOnOpenRules: [],
  summaryPosition: 'right',
  cacheMaxEntries: 1_000_000,
  copyIncludeLink: true,
  copySeparator: ':',
  uiLocale: 'auto',
};

const pageUrl = 'https://example.com/article/cache-test';

describe('summarizePageTextWithLlm', () => {
  beforeEach(async () => {
    storage.clear();
    await clearSummaryCache();
  });

  it('returns assistant content from chat completions', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'A short summary.' } }],
      }),
    })) as unknown as typeof fetch;

    const result = await summarizePageTextWithLlm(
      settings,
      'Long article body text for summary.',
      'en',
      pageUrl,
      fetchImpl,
    );

    expect(result).toEqual({ summary: 'A short summary.', fromCache: false });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('marks fromCache when summary is reused for same page url', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'First summary.' } }],
      }),
    })) as unknown as typeof fetch;

    const first = await summarizePageTextWithLlm(
      settings,
      'First body text.',
      'zh-CN',
      pageUrl,
      fetchImpl,
    );
    const second = await summarizePageTextWithLlm(
      settings,
      'Changed body text should still hit cache.',
      'zh-CN',
      `${pageUrl}#comments`,
      fetchImpl,
    );

    expect(first.fromCache).toBe(false);
    expect(second).toEqual({ summary: 'First summary.', fromCache: true });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('rejects empty page text', async () => {
    await expect(summarizePageTextWithLlm(settings, '  ', 'en', pageUrl)).rejects.toThrow(
      /No readable page text/,
    );
  });
});
