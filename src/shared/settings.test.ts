import { describe, expect, it } from 'vitest';
import { getDefaultSettings, parseSettings } from '@/shared/settings';
import { TRANSLATE_CONCURRENCY } from '@/shared/constants';

describe('parseSettings', () => {
  it('returns defaults for invalid input', () => {
    const defaults = getDefaultSettings();
    expect(parseSettings(null)).toEqual(defaults);
    expect(parseSettings(undefined)).toEqual(defaults);
  });

  it('normalizes base url and concurrency', () => {
    const parsed = parseSettings({
      baseUrl: 'https://example.com/v1/',
      apiKey: 'secret',
      model: 'gpt-test',
      targetLang: 'en',
      concurrency: 5.9,
    });

    expect(parsed.baseUrl).toBe('https://example.com/v1');
    expect(parsed.apiKey).toBe('secret');
    expect(parsed.model).toBe('gpt-test');
    expect(parsed.targetLang).toBe('en');
    expect(parsed.concurrency).toBe(5);
  });

  it('falls back concurrency when invalid', () => {
    const parsed = parseSettings({ concurrency: -1 });
    expect(parsed.concurrency).toBe(TRANSLATE_CONCURRENCY);
  });
});
