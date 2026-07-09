import { describe, expect, it } from 'vitest';
import {
  buildChatCompletionsUrl,
  normalizeApiBaseUrl,
} from '@/features/llm/api-url';

describe('normalizeApiBaseUrl', () => {
  it('strips trailing chat completions path', () => {
    expect(normalizeApiBaseUrl('https://openrouter.ai/api/v1/chat/completions'))
      .toBe('https://openrouter.ai/api/v1');
    expect(normalizeApiBaseUrl('https://openrouter.ai/api/v1/chat/completions/'))
      .toBe('https://openrouter.ai/api/v1');
  });

  it('keeps plain v1 base urls', () => {
    expect(normalizeApiBaseUrl('https://openrouter.ai/api/v1/'))
      .toBe('https://openrouter.ai/api/v1');
  });
});

describe('buildChatCompletionsUrl', () => {
  it('builds a single chat completions endpoint', () => {
    expect(buildChatCompletionsUrl('https://openrouter.ai/api/v1'))
      .toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(buildChatCompletionsUrl('https://openrouter.ai/api/v1/chat/completions'))
      .toBe('https://openrouter.ai/api/v1/chat/completions');
  });
});
