import { describe, expect, it } from 'vitest';
import {
  buildChatCompletionsUrl,
  buildGeminiGenerateContentUrl,
  buildGeminiInteractionsUrl,
  normalizeApiBaseUrl,
  normalizeCustomChatCompletionsUrl,
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

  it('fixes gemini urls missing the openai segment', () => {
    expect(normalizeApiBaseUrl('https://generativelanguage.googleapis.com/v1beta'))
      .toBe('https://generativelanguage.googleapis.com/v1beta/openai');
    expect(normalizeApiBaseUrl('https://generativelanguage.googleapis.com/v1beta/'))
      .toBe('https://generativelanguage.googleapis.com/v1beta/openai');
  });

  it('fixes pasted gemini native generateContent urls', () => {
    expect(normalizeApiBaseUrl(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    )).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
  });

  it('strips singular chat completion typos', () => {
    expect(normalizeApiBaseUrl('https://openrouter.ai/api/v1/chat/completion'))
      .toBe('https://openrouter.ai/api/v1');
  });
});

describe('normalizeCustomChatCompletionsUrl', () => {
  it('keeps or appends chat completions path', () => {
    expect(normalizeCustomChatCompletionsUrl(
      'https://api.example.com/v1/chat/completions/',
    )).toBe('https://api.example.com/v1/chat/completions');
    expect(normalizeCustomChatCompletionsUrl('https://api.example.com/v1'))
      .toBe('https://api.example.com/v1/chat/completions');
    expect(normalizeCustomChatCompletionsUrl('https://api.example.com/v1/chat/completion'))
      .toBe('https://api.example.com/v1/chat/completions');
  });
});

describe('buildChatCompletionsUrl', () => {
  it('builds a single chat completions endpoint', () => {
    expect(buildChatCompletionsUrl('https://openrouter.ai/api/v1'))
      .toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(buildChatCompletionsUrl('https://openrouter.ai/api/v1/chat/completions'))
      .toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(buildChatCompletionsUrl(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    )).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  });

  it('builds gemini native generateContent urls', () => {
    expect(buildGeminiGenerateContentUrl(
      'https://generativelanguage.googleapis.com/v1beta/openai',
      'gemini-2.5-flash-lite',
    )).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent');
  });

  it('builds gemini interactions urls', () => {
    expect(buildGeminiInteractionsUrl(
      'https://generativelanguage.googleapis.com/v1beta/openai',
    )).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
  });
});
