import { describe, expect, it, vi, beforeEach } from 'vitest';
import { STORAGE_KEYS } from '@/shared/constants';

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
        get: vi.fn(async (key: string) => ({
          [key]: storage.get(key),
        })),
      },
    },
  },
}));

describe('saveSettings', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('persists settings to browser storage', async () => {
    const { saveSettings } = await import('@/shared/settings');
    const saved = await saveSettings({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'secret',
      model: 'deepseek/deepseek-v4-flash',
      targetLang: 'zh-CN',
      concurrency: 3,
      autoRecoverContentScript: true,
    });

    expect(saved.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(saved.model).toBe('deepseek/deepseek-v4-flash');
    expect(storage.get(STORAGE_KEYS.SETTINGS)).toMatchObject({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
    });
  });
});

describe('parseSettings provider persistence', () => {
  it('keeps custom provider and base url together', async () => {
    const { parseSettings } = await import('@/shared/settings');
    const parsed = parseSettings({
      provider: 'custom',
      baseUrl: 'https://my-proxy.example/v1',
      model: 'my-model',
      apiKey: 'key',
      targetLang: 'en',
      concurrency: 2,
    });

    expect(parsed.provider).toBe('custom');
    expect(parsed.baseUrl).toBe('https://my-proxy.example/v1');
    expect(parsed.model).toBe('my-model');
  });
});
