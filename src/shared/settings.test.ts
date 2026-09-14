import { describe, expect, it } from 'vitest';
import { getDefaultSettings, parseSettings, applyProviderPreset } from '@/shared/settings';

describe('parseSettings', () => {
  it('returns defaults for invalid input', () => {
    const defaults = getDefaultSettings();
    expect(parseSettings(null)).toEqual(defaults);
    expect(parseSettings(undefined)).toEqual(defaults);
  });

  it('normalizes base url', () => {
    const parsed = parseSettings({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions/',
      apiKey: 'secret',
      model: 'deepseek/deepseek-v4-flash',
      targetLang: 'en',
    });

    expect(parsed.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(parsed.provider).toBe('openrouter');
    expect(parsed.apiKey).toBe('secret');
    expect(parsed.model).toBe('deepseek/deepseek-v4-flash');
    expect(parsed.targetLang).toBe('en');
  });

  it('infers provider from base url when missing', () => {
    const parsed = parseSettings({
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      model: 'gemini-2.5-flash-lite',
    });
    expect(parsed.provider).toBe('gemini');
    expect(parsed.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
    expect(parsed.model).toBe('gemini-2.5-flash-lite');
  });

  it('migrates stored gemini-3.1-flash-lite to the 2.5 default', () => {
    const parsed = parseSettings({
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-3.1-flash-lite',
    });
    expect(parsed.model).toBe('gemini-2.5-flash-lite');
  });

  it('normalizes openrouter gemini model ids', () => {
    const parsed = parseSettings({
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'gemini-2.5-flash-lite',
    });
    expect(parsed.model).toBe('google/gemini-2.5-flash-lite');
  });

  it('uses preset base url for known providers', () => {
    const parsed = parseSettings({
      provider: 'gemini',
      baseUrl: 'https://example.com/wrong',
      model: 'gemini-2.5-flash-lite',
    });
    expect(parsed.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
  });

  it('keeps custom chat completions url for custom provider', () => {
    const parsed = parseSettings({
      provider: 'custom',
      baseUrl: 'https://my-proxy.example/v1/',
      model: 'my-model',
    });
    expect(parsed.baseUrl).toBe('https://my-proxy.example/v1/chat/completions');
  });

  it('defaults auto recover to enabled', () => {
    expect(parseSettings({}).autoRecoverContentScript).toBe(true);
    expect(parseSettings({ autoRecoverContentScript: false }).autoRecoverContentScript).toBe(false);
  });

  it('defaults translation mode to bulk', () => {
    expect(getDefaultSettings().translationMode).toBe('bulk');
    expect(parseSettings({}).translationMode).toBe('bulk');
    expect(parseSettings({ translationMode: 'nope' }).translationMode).toBe('bulk');
  });

  it('accepts progressive translation mode', () => {
    expect(parseSettings({ translationMode: 'progressive' }).translationMode).toBe('progressive');
  });

  it('defaults summary position to right', () => {
    expect(getDefaultSettings().summaryPosition).toBe('right');
    expect(parseSettings({}).summaryPosition).toBe('right');
    expect(parseSettings({ summaryPosition: 'left' }).summaryPosition).toBe('left');
    expect(parseSettings({ summaryPosition: 'top' }).summaryPosition).toBe('right');
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
