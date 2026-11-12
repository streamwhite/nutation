import { describe, expect, it, vi } from 'vitest';
import { warmGeminiConnection } from '@/features/llm/gemini-warm';
import type { ExtensionSettings } from '@/shared/settings';

const settings: ExtensionSettings = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'test-key',
  allowChinaDataTransfer: false,
  model: 'gemini-2.5-flash-lite',
  targetLang: 'zh-CN',
  autoRecoverContentScript: true,
  translationMode: 'bulk',
  translateOnOpen: true,
  translateOnOpenRules: [],
  summaryPosition: 'right',
  cacheMaxEntries: 1_000_000,
  copyIncludeTitle: true,
  copyIncludeDescription: true,
  copyIncludeLink: true,
  copySeparator: ':',
  uiLocale: 'auto',
};

describe('warmGeminiConnection', () => {
  it('issues a lightweight GET to the gemini api root', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch;

    await warmGeminiConnection(settings, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-goog-api-key': 'test-key',
        }),
      }),
    );
  });

  it('skips non-gemini providers', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await warmGeminiConnection({
      ...settings,
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
    }, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
