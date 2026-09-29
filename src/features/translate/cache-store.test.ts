import { describe, expect, it } from 'vitest';
import {
  clearStore,
  getCacheStoreStats,
  getManyFromStore,
  setManyInStore,
  trimStoreToMaxEntries,
} from '@/features/translate/cache-store';
import { ESTIMATED_AVG_CACHE_ENTRY_BYTES } from '@/shared/constants';

describe('cache store stats', () => {
  it('reports entry count and estimated bytes for configured max', async () => {
    const maxEntries = 2_000;
    await clearStore();
    await setManyInStore(new Map([
      ['key-one', 'translation one'],
      ['key-two', 'translation two'],
    ]), maxEntries);

    const stats = await getCacheStoreStats(maxEntries);
    expect(stats.entryCount).toBe(2);
    expect(stats.maxEntries).toBe(maxEntries);
    expect(stats.estimatedBytes).toBeGreaterThan(0);
    expect(stats.estimatedMaxBytes).toBe(maxEntries * ESTIMATED_AVG_CACHE_ENTRY_BYTES);
  });

  it('evicts oldest entries when over the configured max', async () => {
    const maxEntries = 1_000;
    await clearStore();
    const entries = new Map<string, string>();
    for (let index = 0; index < maxEntries + 3; index += 1) {
      entries.set(`key-${index}`, `value-${index}`);
    }
    await setManyInStore(entries, maxEntries);

    const stats = await getCacheStoreStats(maxEntries);
    expect(stats.entryCount).toBe(maxEntries);
  });

  it('evicts least recently used entries after reads bump usedAt', async () => {
    const maxEntries = 1_000;
    await clearStore();

    const seed = new Map<string, string>();
    for (let index = 0; index < maxEntries; index += 1) {
      seed.set(`lru-${index}`, `value-${index}`);
    }
    await setManyInStore(seed, maxEntries);

    const keptKey = 'lru-0';
    await getManyFromStore([keptKey]);

    const incoming = new Map<string, string>([['lru-new', 'fresh']]);
    await setManyInStore(incoming, maxEntries);

    const remaining = await getManyFromStore([keptKey, 'lru-1', 'lru-new']);
    expect(remaining.get(keptKey)).toBe('value-0');
    expect(remaining.get('lru-new')).toBe('fresh');
    expect(remaining.has('lru-1')).toBe(false);
    expect((await getCacheStoreStats(maxEntries)).entryCount).toBe(maxEntries);
  });

  it('trims existing entries when max is lowered', async () => {
    const higherLimit = 1_050;
    const lowerLimit = 1_000;
    await clearStore();
    const entries = new Map<string, string>();
    for (let index = 0; index < higherLimit; index += 1) {
      entries.set(`trim-${index}`, `v-${index}`);
    }
    await setManyInStore(entries, higherLimit);
    await trimStoreToMaxEntries(lowerLimit);
    expect((await getCacheStoreStats(lowerLimit)).entryCount).toBe(lowerLimit);
  });

  it('clears all persisted entries', async () => {
    await setManyInStore(new Map([['key', 'value']]));
    await clearStore();
    const stats = await getCacheStoreStats();
    expect(stats.entryCount).toBe(0);
    expect(stats.estimatedBytes).toBe(0);
  });
});
