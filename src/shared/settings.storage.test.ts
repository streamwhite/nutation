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
      autoRecoverContentScript: true,
      translationMode: 'bulk',
    });

    expect(saved.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(saved.model).toBe('deepseek/deepseek-v4-flash');
    expect(storage.get(STORAGE_KEYS.SETTINGS)).toMatchObject({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
    });
  });
});

describe('loadSettings model normalization', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('persists stripped models/ prefix back to storage', async () => {
    storage.set(STORAGE_KEYS.SETTINGS, {
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'secret',
      model: 'models/gemini-2.5-flash-lite',
      targetLang: 'zh-CN',
    });

    const { loadSettings } = await import('@/shared/settings');
    const loaded = await loadSettings();

    expect(loaded.model).toBe('gemini-2.5-flash-lite');
    expect(storage.get(STORAGE_KEYS.SETTINGS)).toMatchObject({
      model: 'gemini-2.5-flash-lite',
    });
  });

  it('rewrites stored gemini-3.1-flash-lite to gemini-2.5-flash-lite', async () => {
    storage.set(STORAGE_KEYS.SETTINGS, {
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'secret',
      model: 'gemini-3.1-flash-lite',
      targetLang: 'zh-CN',
    });

    const { loadSettings } = await import('@/shared/settings');
    const loaded = await loadSettings();

    expect(loaded.model).toBe('gemini-2.5-flash-lite');
    expect(storage.get(STORAGE_KEYS.SETTINGS)).toMatchObject({
      model: 'gemini-2.5-flash-lite',
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
    });

    expect(parsed.provider).toBe('custom');
    expect(parsed.baseUrl).toBe('https://my-proxy.example/v1/chat/completions');
    expect(parsed.model).toBe('my-model');
  });
});
