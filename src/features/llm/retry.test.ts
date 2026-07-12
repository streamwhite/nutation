import { describe, expect, it, vi } from 'vitest';
import {
  getRetryDelayMs,
  isRetryableError,
  isRetryableHttpStatus,
  withRetries,
} from '@/features/llm/retry';

describe('isRetryableHttpStatus', () => {
  it('treats 429 and 5xx overload statuses as retryable', () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(400)).toBe(false);
  });
});

describe('getRetryDelayMs', () => {
  it('uses exponential backoff', () => {
    expect(getRetryDelayMs(0, 500)).toBe(500);
    expect(getRetryDelayMs(1, 500)).toBe(1000);
    expect(getRetryDelayMs(2, 500)).toBe(2000);
  });
});

describe('isRetryableError', () => {
  it('treats network failures as retryable', () => {
    expect(isRetryableError(new Error('Unable to make request: TypeError: Failed to fetch')))
      .toBe(true);
  });
});

describe('withRetries', () => {
  it('retries retryable failures then succeeds', async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(new Error('Translation request failed: HTTP 503'))
      .mockResolvedValueOnce('ok');

    const result = await withRetries(task, { maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable failures', async () => {
    const task = vi.fn().mockRejectedValue(new Error('API key is missing'));
    await expect(withRetries(task, { maxAttempts: 3, baseDelayMs: 1 }))
      .rejects.toThrow(/API key/i);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
