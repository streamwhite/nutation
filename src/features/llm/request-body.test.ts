import {
  API_MAX_TOKENS_CEILING,
  API_MAX_TOKENS_FLOOR,
} from '@/shared/constants';
import { describe, expect, it } from 'vitest';
import { buildChatCompletionBody, estimateMaxTokens } from '@/features/llm/request-body';
import type { ExtensionSettings } from '@/shared/settings';

const settings: ExtensionSettings = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'key',
  model: 'gemini-2.5-flash-lite',
  targetLang: 'zh-CN',
  autoRecoverContentScript: true,
  translationMode: 'bulk',
};

describe('estimateMaxTokens', () => {
  it('scales with input size and caps output', () => {
    const small = estimateMaxTokens([{ id: '0', text: 'Hello' }]);
    const large = estimateMaxTokens([{ id: '0', text: 'x'.repeat(40_000) }]);
    expect(small).toBeGreaterThanOrEqual(API_MAX_TOKENS_FLOOR);
    expect(small).toBeLessThan(API_MAX_TOKENS_CEILING);
    expect(large).toBe(API_MAX_TOKENS_CEILING);
  });
});

describe('buildChatCompletionBody', () => {
  it('limits output tokens for small batches', () => {
    const body = buildChatCompletionBody(
      settings,
      [{ id: '0', text: 'Hello world' }],
      'zh-CN',
    );
    expect(body.max_tokens).toBeTypeOf('number');
    expect(Number(body.max_tokens)).toBeGreaterThanOrEqual(API_MAX_TOKENS_FLOOR);
    expect(Number(body.max_tokens)).toBeLessThanOrEqual(API_MAX_TOKENS_CEILING);
  });
});
