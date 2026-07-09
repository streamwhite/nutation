import { describe, expect, it } from 'vitest';
import {
  buildRequestHeaders,
  getProviderPreset,
  inferProviderFromBaseUrl,
} from '@/shared/providers';
import type { ExtensionSettings } from '@/shared/settings';

const baseSettings: ExtensionSettings = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'test-key',
  model: 'deepseek/deepseek-v4-flash',
  targetLang: 'zh-CN',
  concurrency: 3,
  autoRecoverContentScript: true,
};

describe('getProviderPreset', () => {
  it('returns openrouter and gemini presets', () => {
    expect(getProviderPreset('openrouter').baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(getProviderPreset('gemini').baseUrl)
      .toBe('https://generativelanguage.googleapis.com/v1beta/openai');
  });
});

describe('inferProviderFromBaseUrl', () => {
  it('detects provider from base url', () => {
    expect(inferProviderFromBaseUrl('https://openrouter.ai/api/v1')).toBe('openrouter');
    expect(inferProviderFromBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai'))
      .toBe('gemini');
    expect(inferProviderFromBaseUrl('https://api.example.com/v1')).toBe('custom');
  });
});

describe('buildRequestHeaders', () => {
  it('adds openrouter headers', () => {
    const headers = buildRequestHeaders(baseSettings);
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['HTTP-Referer']).toBeTruthy();
    expect(headers['X-Title']).toBeTruthy();
  });

  it('uses bearer auth only for gemini', () => {
    const headers = buildRequestHeaders({
      provider: 'gemini',
      apiKey: 'test-key',
    });
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['HTTP-Referer']).toBeUndefined();
  });
});
