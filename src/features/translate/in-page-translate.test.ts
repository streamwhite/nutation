import { describe, expect, it, vi, beforeEach } from 'vitest';
import { clearTranslationCache } from '@/features/translate/cache';
import type { ExtensionSettings } from '@/shared/settings';

const translateBatchViaBackground = vi.fn();
const sendMessage = vi.fn().mockResolvedValue({ ok: true });

vi.mock('@/features/translate/background-translate', () => ({
  translateBatchViaBackground,
}));

vi.stubGlobal('browser', {
  runtime: {
    sendMessage,
  },
});

const settings: ExtensionSettings = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'test-key',
  model: 'gemini-2.5-flash-lite',
  targetLang: 'zh-CN',
  autoRecoverContentScript: true,
  translationMode: 'bulk',
};

describe('InPageTranslator', () => {
  beforeEach(async () => {
    translateBatchViaBackground.mockReset();
    sendMessage.mockClear();
    await clearTranslationCache();
  });

  it('routes gemini through background without reloading settings', async () => {
    translateBatchViaBackground.mockResolvedValue([{ id: '0', text: '你好' }]);

    const { InPageTranslator } = await import('@/features/translate/in-page-translate');
    const timing = {
      record: vi.fn(),
      start: vi.fn(),
      end: vi.fn(),
    };
    const translator = new InPageTranslator(
      settings,
      'zh-CN',
      timing as never,
    );

    const result = await translator.translate([{ id: '0', text: 'hello' }]);

    expect(translateBatchViaBackground).toHaveBeenCalledWith(
      settings,
      [{ id: '0', text: 'hello' }],
      'zh-CN',
    );
    expect(result.translations).toEqual([{ id: '0', text: '你好' }]);
    expect(result.fromApi).toBe(1);
  });

  it('converts traditional chinese with opencc and skips the llm', async () => {
    const { InPageTranslator } = await import('@/features/translate/in-page-translate');
    const timing = {
      record: vi.fn(),
      start: vi.fn(),
      end: vi.fn(),
    };
    const translator = new InPageTranslator(settings, 'zh-CN', timing as never);

    const result = await translator.translate([
      { id: '0', text: '軟體', sourceLang: 'zh-Hant-TW' },
    ]);

    expect(translateBatchViaBackground).not.toHaveBeenCalled();
    expect(result.translations).toEqual([{ id: '0', text: '软件' }]);
    expect(result.fromApi).toBe(0);
    expect(timing.start).toHaveBeenCalledWith('opencc_convert');
  });

  it('warms gemini once through background', async () => {
    const { InPageTranslator } = await import('@/features/translate/in-page-translate');
    const timing = {
      record: vi.fn(),
      start: vi.fn(),
      end: vi.fn(),
    };
    const translator = new InPageTranslator(settings, 'zh-CN', timing as never);

    translator.warmProvider();
    translator.warmProvider();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'WARM_PROVIDER',
      settings,
    });
  });

  it('reuses cache for duplicate strings across concurrent batches', async () => {
    const api = Promise.withResolvers<Array<{ id: string; text: string }>>();
    translateBatchViaBackground.mockImplementation(() => api.promise);

    const { InPageTranslator } = await import('@/features/translate/in-page-translate');
    const timing = {
      record: vi.fn(),
      start: vi.fn(),
      end: vi.fn(),
    };
    const translator = new InPageTranslator(settings, 'zh-CN', timing as never);

    const first = translator.translate([{ id: '0', text: 'Same headline' }]);
    const second = translator.translate([{ id: '1', text: 'Same headline' }]);

    await vi.waitFor(() => {
      expect(translateBatchViaBackground).toHaveBeenCalledTimes(1);
    });
    api.resolve([{ id: '0', text: '同一标题' }]);

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.translations).toEqual([{ id: '0', text: '同一标题' }]);
    expect(secondResult.translations).toEqual([{ id: '1', text: '同一标题' }]);

    const stats = translator.getCacheStats();
    expect(stats.lookups).toBe(2);
    expect(stats.hits).toBeGreaterThanOrEqual(1);
  });

  it('reuses session cache for a later duplicate lookup', async () => {
    translateBatchViaBackground.mockResolvedValue([{ id: '0', text: '同一标题' }]);

    const { InPageTranslator } = await import('@/features/translate/in-page-translate');
    const timing = {
      record: vi.fn(),
      start: vi.fn(),
      end: vi.fn(),
    };
    const translator = new InPageTranslator(settings, 'zh-CN', timing as never);

    await translator.translate([{ id: '0', text: 'Same headline' }]);
    const second = await translator.translate([{ id: '1', text: 'Same headline' }]);

    expect(translateBatchViaBackground).toHaveBeenCalledTimes(1);
    expect(second.translations).toEqual([{ id: '1', text: '同一标题' }]);
    expect(second.fromCache).toBe(1);
    expect(translator.getCacheStats().lookups).toBe(2);
    expect(translator.getCacheStats().hits).toBeGreaterThanOrEqual(1);
  });
});
