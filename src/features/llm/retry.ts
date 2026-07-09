import {
  RETRYABLE_HTTP_STATUSES,
  TRANSLATE_MAX_RETRIES,
  TRANSLATE_RETRY_BASE_DELAY_MS,
} from '@/shared/constants';

export class TranslationRequestError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = 'TranslationRequestError';
    this.status = status;
    this.retryable = retryable;
  }
}

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.includes(status as typeof RETRYABLE_HTTP_STATUSES[number]);
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof TranslationRequestError) {
    return error.retryable;
  }
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = message.match(/HTTP\s+(\d{3})/i);
  if (!statusMatch) {
    return false;
  }
  return isRetryableHttpStatus(Number(statusMatch[1]));
}

export function getRetryDelayMs(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * (2 ** attempt);
}

type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

export async function withRetries<T>(
  task: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? TRANSLATE_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? TRANSLATE_RETRY_BASE_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const hasMoreAttempts = attempt < maxAttempts - 1;
      if (!hasMoreAttempts || !isRetryableError(error)) {
        throw error;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, getRetryDelayMs(attempt, baseDelayMs));
      });
    }
  }

  throw lastError;
}
