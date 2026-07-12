import { describe, expect, it } from 'vitest';
import { extractApiErrorMessage } from '@/features/llm/api-error';

describe('extractApiErrorMessage', () => {
  it('reads gemini array error payloads', () => {
    const message = extractApiErrorMessage([{
      error: { message: 'Please pass a valid API key' },
    }], 400);
    expect(message).toBe('Please pass a valid API key');
  });

  it('reads object error payloads', () => {
    const message = extractApiErrorMessage({
      error: { message: 'Model not found' },
    }, 404);
    expect(message).toBe('Model not found');
  });

  it('falls back to http status', () => {
    expect(extractApiErrorMessage(null, 404)).toBe('HTTP 404');
  });
});
