import { describe, expect, it } from 'vitest';
import { extractApiErrorMessage, sanitizeApiErrorMessage } from '@/features/llm/api-error';

describe('sanitizeApiErrorMessage', () => {
  it('strips Google models/ resource prefix from messages', () => {
    expect(sanitizeApiErrorMessage(
      'This model models/gemini-2.5-pro is no longer available to new users.',
    )).toBe('This model gemini-2.5-pro is no longer available to new users.');
  });
});

describe('extractApiErrorMessage', () => {
  it('reads gemini array error payloads', () => {
    const message = extractApiErrorMessage([{
      error: { message: 'Please pass a valid API key' },
    }], 400);
    expect(message).toBe('Please pass a valid API key');
  });

  it('reads object error payloads and strips models/ prefix', () => {
    const message = extractApiErrorMessage({
      error: {
        message: 'This model models/gemini-2.5-pro is no longer available to new users.',
      },
    }, 404);
    expect(message).toBe(
      'This model gemini-2.5-pro is no longer available to new users.',
    );
  });

  it('falls back to http status', () => {
    expect(extractApiErrorMessage(null, 404)).toBe('HTTP 404');
  });
});
