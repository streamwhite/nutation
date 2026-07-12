import { describe, expect, it } from 'vitest';
import { formatStatusText } from '@/features/translate/page-translator';
import type { TabStatus } from '@/features/translate/types';

function status(partial: Partial<TabStatus>): TabStatus {
  return {
    active: false,
    error: null,
    translatedCount: 0,
    ...partial,
  };
}

describe('formatStatusText', () => {
  it('omits node counts', () => {
    expect(formatStatusText(status({ active: true, translatedCount: 0 }))).toBe('Translating…');
    expect(formatStatusText(status({ active: false, translatedCount: 12 }))).toBe('Idle');
  });

  it('appends cache hit rate when lookups exist', () => {
    expect(formatStatusText(status({
      active: true,
      cacheHits: 1,
      cacheLookups: 4,
    }))).toBe('Translating…, cache 25%');
  });
});
