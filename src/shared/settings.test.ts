import { describe, expect, it } from 'vitest';
import { getDefaultSettings, parseSettings, applyProviderPreset } from '@/shared/settings';
import { TRANSLATION_CACHE_MAX_ENTRIES } from '@/shared/constants';

describe('parseSettings', () => {
  it('returns defaults for invalid input', () => {
    const defaults = getDefaultSettings();
    expect(parseSettings(null)).toEqual(defaults);
    expect(parseSettings(undefined)).toEqual(defaults);
  });

  it('keeps API key empty when stored key is empty', () => {
    const parsed = parseSettings({
      provider: 'openai',
      apiKey: '   ',
    });
    expect(parsed.apiKey).toBe('');
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

  it('keeps user-selected gemini model on parse/save', () => {
    const parsed = parseSettings({
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-3.1-flash-lite',
    });
    expect(parsed.model).toBe('gemini-3.1-flash-lite');
  });

  it('strips models/ prefix without remapping model id', () => {
    const parsed = parseSettings({
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'models/gemini-2.5-pro',
    });
    expect(parsed.model).toBe('gemini-2.5-pro');
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

  it('requires consent before keeping the DeepSeek provider', () => {
    const withoutConsent = parseSettings({
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-flash',
    });
    expect(withoutConsent.allowChinaDataTransfer).toBe(false);
    expect(withoutConsent.provider).not.toBe('deepseek');
    expect(withoutConsent.baseUrl).not.toContain('api.deepseek.com');

    const withConsent = parseSettings({
      provider: 'deepseek',
      allowChinaDataTransfer: true,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-flash',
    });
    expect(withConsent.allowChinaDataTransfer).toBe(true);
    expect(withConsent.provider).toBe('deepseek');
    expect(withConsent.baseUrl).toBe('https://api.deepseek.com/v1');
    expect(withConsent.model).toBe('deepseek-v4-flash');
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

  it('defaults translate on open to enabled with empty rules', () => {
    expect(getDefaultSettings().translateOnOpen).toBe(true);
    expect(getDefaultSettings().translateOnOpenRules).toEqual([]);
    expect(parseSettings({}).translateOnOpen).toBe(true);
    expect(parseSettings({ translateOnOpen: false }).translateOnOpen).toBe(false);
  });

  it('defaults cache max entries to one million', () => {
    expect(getDefaultSettings().cacheMaxEntries).toBe(TRANSLATION_CACHE_MAX_ENTRIES);
    expect(parseSettings({}).cacheMaxEntries).toBe(TRANSLATION_CACHE_MAX_ENTRIES);
    expect(parseSettings({ cacheMaxEntries: 250_000 }).cacheMaxEntries).toBe(250_000);
  });

  it('defaults summary position to right', () => {
    expect(getDefaultSettings().summaryPosition).toBe('right');
    expect(parseSettings({}).summaryPosition).toBe('right');
    expect(parseSettings({ summaryPosition: 'left' }).summaryPosition).toBe('left');
    expect(parseSettings({ summaryPosition: 'top' }).summaryPosition).toBe('right');
  });

  it('defaults copy include link to enabled', () => {
    expect(getDefaultSettings().copyIncludeLink).toBe(true);
    expect(parseSettings({}).copyIncludeLink).toBe(true);
    expect(parseSettings({ copyIncludeLink: false }).copyIncludeLink).toBe(false);
  });

  it('defaults copied title and description to enabled', () => {
    expect(getDefaultSettings().copyIncludeTitle).toBe(true);
    expect(getDefaultSettings().copyIncludeDescription).toBe(true);
    expect(parseSettings({}).copyIncludeTitle).toBe(true);
    expect(parseSettings({}).copyIncludeDescription).toBe(true);
    expect(parseSettings({ copyIncludeTitle: false }).copyIncludeTitle).toBe(false);
    expect(parseSettings({ copyIncludeDescription: false }).copyIncludeDescription).toBe(false);
  });

  it('defaults the copy separator to a colon', () => {
    expect(getDefaultSettings().copySeparator).toBe(':');
    expect(parseSettings({}).copySeparator).toBe(':');
    expect(parseSettings({ copySeparator: '\n' }).copySeparator).toBe('\n');
    expect(parseSettings({ copySeparator: ' | ' }).copySeparator).toBe(' | ');
    expect(parseSettings({ copySeparator: '' }).copySeparator).toBe(':');
  });

  it('defaults the interface locale to auto', () => {
    expect(getDefaultSettings().uiLocale).toBe('auto');
    expect(parseSettings({}).uiLocale).toBe('auto');
    expect(parseSettings({ uiLocale: 'zh-CN' }).uiLocale).toBe('zh-CN');
    expect(parseSettings({ uiLocale: 'nope' }).uiLocale).toBe('auto');
  });

  it('parses translate on open rules', () => {
    const parsed = parseSettings({
      translateOnOpenRules: [
        { id: 'a', type: 'domain', pattern: 'example.com', enabled: true },
        { type: 'prefix', pattern: '  ', enabled: true },
        { type: 'regexp', pattern: '^https://', enabled: false },
      ],
    });
    expect(parsed.translateOnOpenRules).toEqual([
      { id: 'a', type: 'domain', pattern: 'example.com', enabled: true },
      expect.objectContaining({ type: 'regexp', pattern: '^https://', enabled: false }),
    ]);
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
