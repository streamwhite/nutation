import { describe, expect, it } from 'vitest';
import {
  buildRequestHeaders,
  buildSamplingParams,
  normalizeGeminiModel,
  normalizeModelName,
} from '@/shared/providers';
import type { ExtensionSettings } from '@/shared/settings';

const baseSettings: ExtensionSettings = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'test-key',
  model: 'deepseek/deepseek-v4-flash',
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

describe('buildSamplingParams', () => {
  it('omits temperature for anthropic models', () => {
    expect(buildSamplingParams('anthropic')).toEqual({});
    expect(buildSamplingParams('openai')).toEqual({ temperature: 0 });
    expect(buildSamplingParams('xai')).toEqual({ temperature: 0 });
  });
});

describe('normalizeGeminiModel', () => {
  it('strips models/ and google/ prefixes without remapping model ids', () => {
    expect(normalizeGeminiModel('gemini-2.5-flash-lite')).toBe('gemini-2.5-flash-lite');
    expect(normalizeGeminiModel('models/gemini-2.5-flash-lite')).toBe('gemini-2.5-flash-lite');
    expect(normalizeGeminiModel('models/models/gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(normalizeGeminiModel('gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(normalizeGeminiModel('gemini-3.1-flash-lite')).toBe('gemini-3.1-flash-lite');
    expect(normalizeGeminiModel('models/gemini-2.5-pro')).toBe('gemini-2.5-pro');
    expect(normalizeGeminiModel('google/models/gemini-2.5-pro')).toBe('gemini-2.5-pro');
  });
});

describe('normalizeModelName', () => {
  it('prefixes bare gemini models for openrouter', () => {
    expect(normalizeModelName('openrouter', 'gemini-2.5-flash-lite'))
      .toBe('google/gemini-2.5-flash-lite');
    expect(normalizeModelName('gemini', 'gemini-2.5-flash-lite'))
      .toBe('gemini-2.5-flash-lite');
  });

  it('strips models/ prefix for openrouter gemini models', () => {
    expect(normalizeModelName('openrouter', 'models/gemini-2.5-pro'))
      .toBe('google/gemini-2.5-pro');
    expect(normalizeModelName('openrouter', 'google/models/gemini-2.5-flash-lite'))
      .toBe('google/gemini-2.5-flash-lite');
  });

  it('keeps user-selected gemini model ids as entered', () => {
    expect(normalizeModelName('gemini', 'gemini-3.1-flash-lite'))
      .toBe('gemini-3.1-flash-lite');
    expect(normalizeModelName('gemini', 'gemini-2.5-pro'))
      .toBe('gemini-2.5-pro');
  });

  it('strips models/ prefix for custom gemini models', () => {
    expect(normalizeModelName('custom', 'models/gemini-2.5-flash-lite'))
      .toBe('gemini-2.5-flash-lite');
  });
});

describe('buildRequestHeaders', () => {
  it('adds openrouter headers', () => {
    const headers = buildRequestHeaders(baseSettings);
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['HTTP-Referer']).toBeTruthy();
    expect(headers['X-Title']).toBeTruthy();
  });

  it('uses bearer auth for anthropic and xai', () => {
    for (const provider of ['anthropic', 'xai'] as const) {
      const headers = buildRequestHeaders({ provider, apiKey: 'test-key' });
      expect(headers.Authorization).toBe('Bearer test-key');
      expect(headers['HTTP-Referer']).toBeUndefined();
    }
  });

  it('uses bearer and goog api key for gemini', () => {
    const headers = buildRequestHeaders({
      provider: 'gemini',
      apiKey: 'test-key',
    });
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['x-goog-api-key']).toBe('test-key');
    expect(headers['HTTP-Referer']).toBeUndefined();
  });
});
