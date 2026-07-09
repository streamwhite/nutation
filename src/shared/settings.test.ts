import { describe, expect, it } from 'vitest';
import { getDefaultSettings, parseSettings, applyProviderPreset } from '@/shared/settings';
import { TRANSLATE_CONCURRENCY } from '@/shared/constants';

describe('parseSettings', () => {
  it('returns defaults for invalid input', () => {
    const defaults = getDefaultSettings();
    expect(parseSettings(null)).toEqual(defaults);
    expect(parseSettings(undefined)).toEqual(defaults);
  });

  it('normalizes base url and concurrency', () => {
    const parsed = parseSettings({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions/',
      apiKey: 'secret',
      model: 'deepseek/deepseek-v4-flash',
      targetLang: 'en',
      concurrency: 5.9,
    });

    expect(parsed.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(parsed.provider).toBe('openrouter');
    expect(parsed.apiKey).toBe('secret');
    expect(parsed.model).toBe('deepseek/deepseek-v4-flash');
    expect(parsed.targetLang).toBe('en');
    expect(parsed.concurrency).toBe(5);
  });

  it('infers provider from base url when missing', () => {
    const parsed = parseSettings({
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-2.5-flash',
    });
    expect(parsed.provider).toBe('gemini');
  });

  it('falls back concurrency when invalid', () => {
    const parsed = parseSettings({ concurrency: -1 });
    expect(parsed.concurrency).toBe(TRANSLATE_CONCURRENCY);
  });

  it('defaults auto recover to enabled', () => {
    expect(parseSettings({}).autoRecoverContentScript).toBe(true);
    expect(parseSettings({ autoRecoverContentScript: false }).autoRecoverContentScript).toBe(false);
  });
});

describe('applyProviderPreset', () => {
  it('fills openrouter defaults', () => {
    const current = getDefaultSettings();
    const next = applyProviderPreset(current, 'openrouter');
    expect(next.provider).toBe('openrouter');
    expect(next.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(next.model).toBe('deepseek/deepseek-v4-flash');
  });
});
