import {
  ESTIMATED_AVG_CACHE_ENTRY_BYTES,
  MEMORY_CACHE_MAX_ENTRIES,
  TRANSLATION_CACHE_DB_NAME,
  TRANSLATION_CACHE_MAX_ENTRIES,
  TRANSLATION_CACHE_STORE_NAME,
} from '@/shared/constants';

type CacheRecord = {
  translation: string;
  usedAt: number;
};

export type CacheStoreStats = {
  entryCount: number;
  maxEntries: number;
  estimatedBytes: number;
  estimatedMaxBytes: number;
  storageUsageBytes: number | null;
  storageQuotaBytes: number | null;
};

const RECORD_OVERHEAD_BYTES = 24;

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(TRANSLATION_CACHE_DB_NAME, 1);
      request.onerror = () => reject(request.error ?? new Error('Failed to open cache database'));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(TRANSLATION_CACHE_STORE_NAME)) {
          const store = db.createObjectStore(TRANSLATION_CACHE_STORE_NAME);
          store.createIndex('usedAt', 'usedAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(TRANSLATION_CACHE_STORE_NAME, mode);
  const store = transaction.objectStore(TRANSLATION_CACHE_STORE_NAME);
  const result = await runner(store);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Cache transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Cache transaction aborted'));
  });
  return result;
}

async function countEntries(store: IDBObjectStore): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Cache count failed'));
  });
}

async function evictOldest(store: IDBObjectStore, removeCount: number): Promise<void> {
  if (removeCount <= 0) {
    return;
  }

  const index = store.index('usedAt');
  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const collected: IDBValidKey[] = [];
    const request = index.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || collected.length >= removeCount) {
        resolve(collected);
        return;
      }
      collected.push(cursor.primaryKey);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('Cache eviction failed'));
  });

  await Promise.all(keys.map((key) => new Promise<void>((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Cache delete failed'));
  })));
}

async function ensureCapacity(store: IDBObjectStore, incomingCount: number): Promise<void> {
  const total = await countEntries(store);
  const overflow = total + incomingCount - TRANSLATION_CACHE_MAX_ENTRIES;
  if (overflow > 0) {
    await evictOldest(store, overflow);
  }
}

export async function getManyFromStore(keys: string[]): Promise<Map<string, string>> {
  if (!isIndexedDbAvailable() || keys.length === 0) {
    return new Map();
  }

  return withStore('readonly', async (store) => {
    const result = new Map<string, string>();

    await Promise.all(keys.map((key) => new Promise<void>((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const record = request.result as CacheRecord | undefined;
        if (record?.translation) {
          result.set(key, record.translation);
        }
        resolve();
      };
      request.onerror = () => resolve();
    })));

    return result;
  });
}

export async function setManyInStore(entries: Map<string, string>): Promise<void> {
  if (!isIndexedDbAvailable() || entries.size === 0) {
    return;
  }

  await withStore('readwrite', async (store) => {
    await ensureCapacity(store, entries.size);
    const now = Date.now();
    await Promise.all(Array.from(entries.entries()).map(([key, translation]) => (
      new Promise<void>((resolve, reject) => {
        const request = store.put({ translation, usedAt: now } satisfies CacheRecord, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('Cache write failed'));
      })
    )));
  });
}

export function trimMemoryCache(cache: Map<string, string>): void {
  while (cache.size > MEMORY_CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (!firstKey) {
      break;
    }
    cache.delete(firstKey);
  }
}

function estimateEntryBytes(key: string, record: CacheRecord): number {
  return (key.length + record.translation.length) * 2 + RECORD_OVERHEAD_BYTES;
}

async function estimateStoreBytes(store: IDBObjectStore): Promise<number> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(total);
        return;
      }
      const record = cursor.value as CacheRecord;
      total += estimateEntryBytes(String(cursor.key), record);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('Cache size estimate failed'));
  });
}

async function readStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    if (typeof estimate.usage !== 'number' || typeof estimate.quota !== 'number') {
      return null;
    }
    return { usage: estimate.usage, quota: estimate.quota };
  } catch {
    return null;
  }
}

export async function getCacheStoreStats(): Promise<CacheStoreStats> {
  const estimatedMaxBytes = TRANSLATION_CACHE_MAX_ENTRIES * ESTIMATED_AVG_CACHE_ENTRY_BYTES;
  const storage = await readStorageEstimate();

  if (!isIndexedDbAvailable()) {
    return {
      entryCount: 0,
      maxEntries: TRANSLATION_CACHE_MAX_ENTRIES,
      estimatedBytes: 0,
      estimatedMaxBytes,
      storageUsageBytes: storage?.usage ?? null,
      storageQuotaBytes: storage?.quota ?? null,
    };
  }

  return withStore('readonly', async (store) => {
    const entryCount = await countEntries(store);
    const estimatedBytes = entryCount > 0 ? await estimateStoreBytes(store) : 0;
    return {
      entryCount,
      maxEntries: TRANSLATION_CACHE_MAX_ENTRIES,
      estimatedBytes,
      estimatedMaxBytes,
      storageUsageBytes: storage?.usage ?? null,
      storageQuotaBytes: storage?.quota ?? null,
    };
  });
}

export async function clearStore(): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore('readwrite', async (store) => {
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Cache clear failed'));
    });
  });
}
