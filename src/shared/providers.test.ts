import { describe, expect, it } from 'vitest';
import {
  buildRequestHeaders,
  normalizeGeminiModel,
  normalizeModelName,
  toGeminiInteractionModelId,
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
};

describe('normalizeGeminiModel', () => {
  it('strips models/ prefix and maps 3.1 flash-lite back to 2.5 default', () => {
    expect(normalizeGeminiModel('gemini-2.5-flash-lite')).toBe('gemini-2.5-flash-lite');
    expect(normalizeGeminiModel('models/gemini-2.5-flash-lite')).toBe('gemini-2.5-flash-lite');
    expect(normalizeGeminiModel('models/models/gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(normalizeGeminiModel('gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(normalizeGeminiModel('gemini-3.1-flash-lite')).toBe('gemini-2.5-flash-lite');
  });
});

describe('toGeminiInteractionModelId', () => {
  it('never keeps a models/ prefix for interactions', () => {
    expect(toGeminiInteractionModelId('models/gemini-2.5-flash-lite')).toBe('gemini-2.5-flash-lite');
  });
});

describe('normalizeModelName', () => {
  it('prefixes bare gemini models for openrouter', () => {
    expect(normalizeModelName('openrouter', 'gemini-2.5-flash-lite'))
      .toBe('google/gemini-2.5-flash-lite');
    expect(normalizeModelName('gemini', 'gemini-2.5-flash-lite'))
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
