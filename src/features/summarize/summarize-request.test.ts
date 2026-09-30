import { describe, expect, it } from 'vitest';
import {
  buildSummarizeChatBody,
  buildSummarizeUserPrompt,
  getSummarizeSystemPrompt,
} from '@/features/summarize/summarize-request';
import type { ExtensionSettings } from '@/shared/settings';

const settings: ExtensionSettings = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'test-key',
  model: 'openai/gpt-4o-mini',
  targetLang: 'zh-CN',
  autoRecoverContentScript: true,
  translationMode: 'bulk',
  translateOnOpen: true,
  translateOnOpenRules: [],
  summaryPosition: 'right',
  cacheMaxEntries: 1_000_000,
  copyIncludeLink: true,
  uiLocale: 'auto',
};

describe('summarize request body', () => {
  it('builds a summarize prompt in the target language', () => {
    const prompt = buildSummarizeUserPrompt('Page body text', 'zh-CN');
    expect(prompt).toContain('lang=zh-CN');
    expect(prompt).toContain('Page body text');
    expect(getSummarizeSystemPrompt().length).toBeGreaterThan(20);
  });

  it('builds chat completion body without translation json schema', () => {
    const body = buildSummarizeChatBody(settings, 'Hello world article', 'en');
    expect(body.model).toBe('openai/gpt-4o-mini');
    expect(body.temperature).toBe(0);
    expect(body.messages).toEqual([
      { role: 'system', content: getSummarizeSystemPrompt() },
      { role: 'user', content: buildSummarizeUserPrompt('Hello world article', 'en') },
    ]);
  });
});
