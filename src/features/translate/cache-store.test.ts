import { describe, expect, it } from 'vitest';
import {
  clearStore,
  getCacheStoreStats,
  setManyInStore,
} from '@/features/translate/cache-store';
import { TRANSLATION_CACHE_MAX_ENTRIES } from '@/shared/constants';

describe('cache store stats', () => {
  it('reports entry count and estimated bytes', async () => {
    await clearStore();
    await setManyInStore(new Map([
      ['key-one', 'translation one'],
      ['key-two', 'translation two'],
    ]));

    const stats = await getCacheStoreStats();
    expect(stats.entryCount).toBe(2);
    expect(stats.maxEntries).toBe(TRANSLATION_CACHE_MAX_ENTRIES);
    expect(stats.estimatedBytes).toBeGreaterThan(0);
    expect(stats.estimatedMaxBytes).toBe(TRANSLATION_CACHE_MAX_ENTRIES * 320);
  });

  it('clears all persisted entries', async () => {
    await setManyInStore(new Map([['key', 'value']]));
    await clearStore();
    const stats = await getCacheStoreStats();
    expect(stats.entryCount).toBe(0);
    expect(stats.estimatedBytes).toBe(0);
  });
});
