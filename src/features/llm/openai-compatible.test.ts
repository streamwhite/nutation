import { describe, expect, it, vi } from 'vitest';
import { translateBatchWithOpenAI } from '@/features/llm/openai-compatible';
import type { ExtensionSettings } from '@/shared/settings';

const settings: ExtensionSettings = {
  provider: 'openrouter',
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'test-key',
  model: 'test-model',
  targetLang: 'zh-CN',
  autoRecoverContentScript: true,
  translationMode: 'bulk',
};

describe('translateBatchWithOpenAI', () => {
  it('posts chat completions and parses line format', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '0\t你好\n1\t世界',
          },
        }],
      }),
    })) as unknown as typeof fetch;

    const result = await translateBatchWithOpenAI(
      settings,
      [
        { id: '0', text: 'hello' },
        { id: '1', text: 'world' },
      ],
      'zh-CN',
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result).toEqual([
      { id: '0', text: '你好' },
      { id: '1', text: '世界' },
    ]);
  });

  it('still parses JSON array responses', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify([
              { id: '0', text: '你好' },
              { id: '1', text: '世界' },
            ]),
          },
        }],
      }),
    })) as unknown as typeof fetch;

    const result = await translateBatchWithOpenAI(
      settings,
      [
        { id: '0', text: 'hello' },
        { id: '1', text: 'world' },
      ],
      'zh-CN',
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result).toEqual([
      { id: '0', text: '你好' },
      { id: '1', text: '世界' },
    ]);
  });

  it('rejects missing api key', async () => {
    await expect(translateBatchWithOpenAI(
      { ...settings, apiKey: '' },
      [{ id: '0', text: 'hello' }],
      'zh-CN',
    )).rejects.toThrow(/API key/i);
  });
});
