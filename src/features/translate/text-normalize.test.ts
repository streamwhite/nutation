import { describe, expect, it } from 'vitest';
import {
  isLikelyDateText,
  normalizeCacheText,
} from '@/features/translate/text-normalize';

describe('normalizeCacheText', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeCacheText('  hello   world  ')).toBe('hello world');
  });
});

describe('isLikelyDateText', () => {
  it('detects common date and relative time strings', () => {
    expect(isLikelyDateText('2025-01-01')).toBe(true);
    expect(isLikelyDateText('Jan 1, 2025')).toBe(true);
    expect(isLikelyDateText('3 hours ago')).toBe(true);
    expect(isLikelyDateText('Article title')).toBe(false);
  });
});
