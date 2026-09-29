import { describe, expect, it, vi } from 'vitest';
import { translateBatchWithGeminiNative } from '@/features/llm/gemini-native';
import { TRANSLATION_RESPONSE_FORMAT } from '@/features/llm/translation-schema';
import type { ExtensionSettings } from '@/shared/settings';

const settings: ExtensionSettings = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'test-key',
  model: 'models/gemini-2.5-flash-lite',
  targetLang: 'zh-CN',
  autoRecoverContentScript: true,
  translationMode: 'bulk',
  translateOnOpen: true,
  translateOnOpenRules: [],
  summaryPosition: 'right',
  cacheMaxEntries: 1_000_000,
  copyIncludeLink: true,
};

describe('translateBatchWithGeminiNative', () => {
  it('requests structured json from interactions.create', async () => {
    const createInteraction = vi.fn(async () => ({
      output_text: JSON.stringify({ items: [{ id: '0', text: '你好' }] }),
    }));
    const clientFactory = vi.fn(() => ({ createInteraction }));

    const result = await translateBatchWithGeminiNative(
      settings,
      [{ id: '0', text: 'hello' }],
      'zh-CN',
      clientFactory,
    );

    expect(clientFactory).toHaveBeenCalledWith(
      'test-key',
      'https://generativelanguage.googleapis.com/v1beta/openai',
    );
    expect(createInteraction).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-flash-lite',
      input: expect.any(String),
      system_instruction: expect.any(String),
      response_format: TRANSLATION_RESPONSE_FORMAT,
      generation_config: expect.objectContaining({
        temperature: 0,
        thinking_level: 'minimal',
      }),
    }));
    expect(result).toEqual([{ id: '0', text: '你好' }]);
  });

  it('uses low thinking level for pro models that reject minimal', async () => {
    const createInteraction = vi.fn(async () => ({
      output_text: JSON.stringify({ items: [{ id: '0', text: '你好' }] }),
    }));
    const clientFactory = vi.fn(() => ({ createInteraction }));

    await translateBatchWithGeminiNative(
      { ...settings, model: 'gemini-2.5-pro' },
      [{ id: '0', text: 'hello' }],
      'zh-CN',
      clientFactory,
    );

    expect(createInteraction).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-pro',
      generation_config: expect.objectContaining({
        thinking_level: 'low',
      }),
    }));
  });

  it('retries truncated items one by one', async () => {
    const longSource = 'I had it myself as a player at Euro 96 when we beat the Netherlands 4-1 at Wembley and felt unstoppable.';
    const createInteraction = vi.fn(async (params: { input: string }) => {
      if (params.input.includes(longSource) && params.input.includes('Hello world')) {
        return {
          output_text: JSON.stringify({
            items: [
              { id: '0', text: '你好世界' },
              { id: '1', text: '当时我们在温布' },
            ],
          }),
        };
      }
      return {
        output_text: JSON.stringify({
          items: [{
            id: '1',
            text: '我在欧洲杯96年以球员身份亲历过，当时我们在温布利4比1击败荷兰，感觉势不可挡。',
          }],
        }),
      };
    });
    const clientFactory = vi.fn(() => ({ createInteraction }));

    const result = await translateBatchWithGeminiNative(
      settings,
      [
        { id: '0', text: 'Hello world' },
        { id: '1', text: longSource },
      ],
      'zh-CN',
      clientFactory,
    );

    expect(result).toEqual([
      { id: '0', text: '你好世界' },
      {
        id: '1',
        text: '我在欧洲杯96年以球员身份亲历过，当时我们在温布利4比1击败荷兰，感觉势不可挡。',
      },
    ]);
    expect(createInteraction).toHaveBeenCalledTimes(2);
  });
});
