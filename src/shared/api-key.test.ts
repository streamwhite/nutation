import { describe, expect, it } from 'vitest';
import {
  API_KEY_MISSING_MESSAGE,
  hasApiKey,
  resolveDefaultApiKey,
} from '@/shared/api-key';

describe('hasApiKey', () => {
  it('rejects empty or whitespace keys', () => {
    expect(hasApiKey({ apiKey: '' })).toBe(false);
    expect(hasApiKey({ apiKey: '   ' })).toBe(false);
  });

  it('accepts a configured key', () => {
    expect(hasApiKey({ apiKey: 'sk-test' })).toBe(true);
  });
});

describe('resolveDefaultApiKey', () => {
  it('returns env key only in development', () => {
    expect(resolveDefaultApiKey({
      DEV: true,
      VITE_DEV_API_KEY: ' sk-dev ',
    })).toBe('sk-dev');
    expect(resolveDefaultApiKey({
      MODE: 'development',
      VITE_DEV_API_KEY: 'sk-dev',
    })).toBe('sk-dev');
  });

  it('ignores env key outside development', () => {
    expect(resolveDefaultApiKey({
      DEV: false,
      MODE: 'production',
      VITE_DEV_API_KEY: 'sk-dev',
    })).toBe('');
  });
});

describe('API_KEY_MISSING_MESSAGE', () => {
  it('points user to options', () => {
    expect(API_KEY_MISSING_MESSAGE).toMatch(/options/i);
  });
});
