import {
  MEMORY_CACHE_MAX_ENTRIES,
  SUMMARY_CACHE_DB_VERSION,
  SUMMARY_CACHE_STORE_NAME,
  TRANSLATION_CACHE_DB_NAME,
  TRANSLATION_CACHE_MAX_ENTRIES,
  TRANSLATION_CACHE_STORE_NAME,
} from '@/shared/constants';
import {
  estimateCacheCapacityBytes,
  resolveCacheMaxEntries,
} from '@/features/translate/cache-max-entries';

type CacheRecord = {
  translation: string;
  usedAt: number;
};

const CACHE_STORE_NAMES = [
  TRANSLATION_CACHE_STORE_NAME,
  SUMMARY_CACHE_STORE_NAME,
] as const;

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
let usedAtClock = 0;

function nextUsedAt(): number {
  const now = Date.now();
  usedAtClock = Math.max(usedAtClock + 1, now);
  return usedAtClock;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function ensureObjectStore(db: IDBDatabase, storeName: string): void {
  if (db.objectStoreNames.contains(storeName)) {
    return;
  }
  const store = db.createObjectStore(storeName);
  store.createIndex('usedAt', 'usedAt');
}

function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(TRANSLATION_CACHE_DB_NAME, SUMMARY_CACHE_DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error('Failed to open cache database'));
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const storeName of CACHE_STORE_NAMES) {
          ensureObjectStore(db, storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }
  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
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

async function ensureCapacity(
  store: IDBObjectStore,
  incomingCount: number,
  maxEntries: number,
): Promise<void> {
  const total = await countEntries(store);
  const overflow = total + incomingCount - maxEntries;
  if (overflow > 0) {
    await evictOldest(store, overflow);
  }
}

function putRecord(
  store: IDBObjectStore,
  key: string,
  record: CacheRecord,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.put(record, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Cache write failed'));
  });
}

async function touchHit(
  store: IDBObjectStore,
  key: string,
  record: CacheRecord,
  usedAt: number,
): Promise<void> {
  if (record.usedAt === usedAt) {
    return;
  }
  await putRecord(store, key, { translation: record.translation, usedAt });
}

export async function getManyFromStore(keys: string[]): Promise<Map<string, string>> {
  if (!isIndexedDbAvailable() || keys.length === 0) {
    return new Map();
  }

  return withStore(TRANSLATION_CACHE_STORE_NAME, 'readwrite', async (store) => {
    const result = new Map<string, string>();
    const usedAt = nextUsedAt();

    await Promise.all(keys.map((key) => new Promise<void>((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const record = request.result as CacheRecord | undefined;
        if (!record?.translation) {
          resolve();
          return;
        }
        result.set(key, record.translation);
        void touchHit(store, key, record, usedAt).finally(() => resolve());
      };
      request.onerror = () => resolve();
    })));

    return result;
  });
}

export async function touchManyInStore(keys: string[]): Promise<void> {
  if (!isIndexedDbAvailable() || keys.length === 0) {
    return;
  }

  await withStore(TRANSLATION_CACHE_STORE_NAME, 'readwrite', async (store) => {
    const usedAt = nextUsedAt();
    await Promise.all(keys.map((key) => new Promise<void>((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const record = request.result as CacheRecord | undefined;
        if (!record?.translation) {
          resolve();
          return;
        }
        void touchHit(store, key, record, usedAt).finally(() => resolve());
      };
      request.onerror = () => resolve();
    })));
  });
}

export async function setManyInStore(
  entries: Map<string, string>,
  maxEntries = TRANSLATION_CACHE_MAX_ENTRIES,
): Promise<void> {
  if (!isIndexedDbAvailable() || entries.size === 0) {
    return;
  }

  const limit = resolveCacheMaxEntries(maxEntries);
  await withStore(TRANSLATION_CACHE_STORE_NAME, 'readwrite', async (store) => {
    const now = nextUsedAt();
    await Promise.all(Array.from(entries.entries()).map(([key, translation]) => (
      putRecord(store, key, { translation, usedAt: now })
    )));
    await ensureCapacity(store, 0, limit);
  });
}

export async function trimStoreToMaxEntries(maxEntries: number): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }

  const limit = resolveCacheMaxEntries(maxEntries);
  await withStore(TRANSLATION_CACHE_STORE_NAME, 'readwrite', async (store) => {
    await ensureCapacity(store, 0, limit);
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

export async function getCacheStoreStats(
  maxEntries = TRANSLATION_CACHE_MAX_ENTRIES,
): Promise<CacheStoreStats> {
  const limit = resolveCacheMaxEntries(maxEntries);
  const estimatedMaxBytes = estimateCacheCapacityBytes(limit);
  const storage = await readStorageEstimate();

  if (!isIndexedDbAvailable()) {
    return {
      entryCount: 0,
      maxEntries: limit,
      estimatedBytes: 0,
      estimatedMaxBytes,
      storageUsageBytes: storage?.usage ?? null,
      storageQuotaBytes: storage?.quota ?? null,
    };
  }

  return withStore(TRANSLATION_CACHE_STORE_NAME, 'readonly', async (store) => {
    const entryCount = await countEntries(store);
    const estimatedBytes = entryCount > 0 ? await estimateStoreBytes(store) : 0;
    return {
      entryCount,
      maxEntries: limit,
      estimatedBytes,
      estimatedMaxBytes,
      storageUsageBytes: storage?.usage ?? null,
      storageQuotaBytes: storage?.quota ?? null,
    };
  });
}

export async function getOneFromNamedStore(
  storeName: string,
  key: string,
): Promise<string | null> {
  if (!isIndexedDbAvailable() || !key) {
    return null;
  }

  return withStore(storeName, 'readwrite', async (store) => {
    const usedAt = nextUsedAt();
    return new Promise<string | null>((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const record = request.result as CacheRecord | undefined;
        if (!record?.translation) {
          resolve(null);
          return;
        }
        void touchHit(store, key, record, usedAt)
          .then(() => resolve(record.translation))
          .catch(() => resolve(record.translation));
      };
      request.onerror = () => resolve(null);
    });
  });
}

export async function setOneInNamedStore(
  storeName: string,
  key: string,
  value: string,
  maxEntries: number,
): Promise<void> {
  if (!isIndexedDbAvailable() || !key || !value) {
    return;
  }

  await withStore(storeName, 'readwrite', async (store) => {
    await putRecord(store, key, { translation: value, usedAt: nextUsedAt() });
    await ensureCapacity(store, 0, Math.max(1, Math.round(maxEntries)));
  });
}

export async function clearNamedStore(storeName: string): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore(storeName, 'readwrite', async (store) => {
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Cache clear failed'));
    });
  });
}

export async function clearStore(): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await Promise.all(CACHE_STORE_NAMES.map((storeName) => clearNamedStore(storeName)));
}
