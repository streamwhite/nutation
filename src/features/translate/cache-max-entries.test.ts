import { describe, expect, it } from 'vitest';
import {
  estimateCacheCapacityBytes,
  resolveCacheMaxEntries,
} from '@/features/translate/cache-max-entries';
import {
  ESTIMATED_AVG_CACHE_ENTRY_BYTES,
  TRANSLATION_CACHE_ENTRIES_HARD_LIMIT,
  TRANSLATION_CACHE_MAX_ENTRIES,
  TRANSLATION_CACHE_MIN_ENTRIES,
} from '@/shared/constants';

describe('resolveCacheMaxEntries', () => {
  it('defaults to one million entries', () => {
    expect(TRANSLATION_CACHE_MAX_ENTRIES).toBe(1_000_000);
    expect(resolveCacheMaxEntries(undefined)).toBe(TRANSLATION_CACHE_MAX_ENTRIES);
    expect(resolveCacheMaxEntries(null)).toBe(TRANSLATION_CACHE_MAX_ENTRIES);
    expect(resolveCacheMaxEntries('nope')).toBe(TRANSLATION_CACHE_MAX_ENTRIES);
  });

  it('clamps to configured bounds', () => {
    expect(resolveCacheMaxEntries(0)).toBe(TRANSLATION_CACHE_MIN_ENTRIES);
    expect(resolveCacheMaxEntries(TRANSLATION_CACHE_ENTRIES_HARD_LIMIT + 1))
      .toBe(TRANSLATION_CACHE_ENTRIES_HARD_LIMIT);
    expect(resolveCacheMaxEntries(250_000)).toBe(250_000);
  });

  it('parses numeric strings', () => {
    expect(resolveCacheMaxEntries('1500000')).toBe(1_500_000);
  });
});

describe('estimateCacheCapacityBytes', () => {
  it('estimates space from entry count', () => {
    expect(estimateCacheCapacityBytes(TRANSLATION_CACHE_MAX_ENTRIES))
      .toBe(TRANSLATION_CACHE_MAX_ENTRIES * ESTIMATED_AVG_CACHE_ENTRY_BYTES);
  });
});
