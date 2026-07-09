import { describe, expect, it } from 'vitest';
import {
  isConnectionError,
  isRestrictedUrl,
} from '@/features/content-script/recover';

describe('isConnectionError', () => {
  it('detects missing receiving end errors', () => {
    expect(isConnectionError(new Error('Could not establish connection. Receiving end does not exist.'))).toBe(true);
    expect(isConnectionError('Receiving end does not exist')).toBe(true);
    expect(isConnectionError(new Error('API key missing'))).toBe(false);
  });
});

describe('isRestrictedUrl', () => {
  it('blocks browser internal pages', () => {
    expect(isRestrictedUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedUrl('https://example.com/article')).toBe(false);
  });
});
