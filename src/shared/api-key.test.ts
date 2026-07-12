import { describe, expect, it } from 'vitest';
import {
  API_KEY_MISSING_MESSAGE,
  hasApiKey,
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

describe('API_KEY_MISSING_MESSAGE', () => {
  it('points user to options', () => {
    expect(API_KEY_MISSING_MESSAGE).toMatch(/options/i);
  });
});
