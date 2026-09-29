import { buildCacheKey } from '@/features/translate/cache-key';
import {
  clearStore,
  getManyFromStore,
  setManyInStore,
  touchManyInStore,
  trimMemoryCache,
} from '@/features/translate/cache-store';
import { normalizeCacheText } from '@/features/translate/text-normalize';
import { clearSummaryCache } from '@/features/summarize/summary-cache';
import { loadSettings } from '@/shared/settings';
import {
  CACHE_LRU_TOUCH_DEBOUNCE_MS,
  TRANSLATION_CACHE_MAX_ENTRIES,
} from '@/shared/constants';

const memoryCache = new Map<string, string>();
let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let touchTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 250;
const pendingWrites = new Map<string, string>();
const pendingTouches = new Set<string>();

async function ensureHydrated(): Promise<void> {
  if (hydrated) {
    return;
  }
  hydrated = true;
}

function rememberInMemory(key: string, translation: string): void {
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  }
  memoryCache.set(key, translation);
  trimMemoryCache(memoryCache);
}

function schedulePersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void flushPendingWrites();
  }, PERSIST_DEBOUNCE_MS);
}

function scheduleLruTouch(keys: string[]): void {
  for (const key of keys) {
    if (!pendingWrites.has(key)) {
      pendingTouches.add(key);
    }
  }
  if (pendingTouches.size === 0) {
    return;
  }
  if (touchTimer) {
    clearTimeout(touchTimer);
  }
  touchTimer = setTimeout(() => {
    touchTimer = null;
    void flushPendingTouches();
  }, CACHE_LRU_TOUCH_DEBOUNCE_MS);
}

async function flushPendingTouches(): Promise<void> {
  if (pendingTouches.size === 0) {
    return;
  }
  const keys = Array.from(pendingTouches);
  pendingTouches.clear();
  try {
    await touchManyInStore(keys);
  } catch (error) {
    console.error('Failed to update IndexedDB LRU timestamps.', error);
  }
}

async function resolveMaxEntries(): Promise<number> {
  try {
    const settings = await loadSettings();
    return settings.cacheMaxEntries;
  } catch (error) {
    console.error('Failed to load cache max entries, using default.', error);
    return TRANSLATION_CACHE_MAX_ENTRIES;
  }
}

async function flushPendingWrites(): Promise<void> {
  if (pendingWrites.size === 0) {
    return;
  }
  const batch = new Map(pendingWrites);
  pendingWrites.clear();
  for (const key of batch.keys()) {
    pendingTouches.delete(key);
  }
  const maxEntries = await resolveMaxEntries();
  await setManyInStore(batch, maxEntries);
}

export async function getCachedTranslation(
  text: string,
  targetLang: string,
  model: string,
): Promise<string | null> {
  await ensureHydrated();
  const key = buildCacheKey(text, targetLang, model);
  const memoryHit = memoryCache.get(key);
  if (memoryHit) {
    rememberInMemory(key, memoryHit);
    scheduleLruTouch([key]);
    return memoryHit;
  }

  const fromStore = await getManyFromStore([key]);
  const hit = fromStore.get(key);
  if (hit) {
    rememberInMemory(key, hit);
  }
  return hit ?? null;
}

export async function getCachedTranslations(
  texts: string[],
  targetLang: string,
  model: string,
): Promise<Map<string, string>> {
  await ensureHydrated();
  const keyByText = new Map<string, string>();
  const keys: string[] = [];
  const memoryHitKeys: string[] = [];

  for (const text of texts) {
    const normalized = normalizeCacheText(text);
    if (keyByText.has(normalized)) {
      continue;
    }
    const key = buildCacheKey(normalized, targetLang, model);
    keyByText.set(normalized, key);
    if (memoryCache.has(key)) {
      memoryHitKeys.push(key);
    } else {
      keys.push(key);
    }
  }

  const fromStore = keys.length > 0 ? await getManyFromStore(keys) : new Map<string, string>();
  const result = new Map<string, string>();

  for (const text of texts) {
    const normalized = normalizeCacheText(text);
    const key = keyByText.get(normalized);
    if (!key) {
      continue;
    }
    const hit = memoryCache.get(key) ?? fromStore.get(key);
    if (hit) {
      rememberInMemory(key, hit);
      result.set(normalized, hit);
    }
  }

  if (memoryHitKeys.length > 0) {
    scheduleLruTouch(memoryHitKeys);
  }

  return result;
}

export async function setCachedTranslation(
  text: string,
  targetLang: string,
  model: string,
  translation: string,
): Promise<void> {
  await ensureHydrated();
  const key = buildCacheKey(text, targetLang, model);
  rememberInMemory(key, translation);
  pendingWrites.set(key, translation);
  schedulePersist();
}

export function setCachedTranslations(
  entries: Array<{ text: string; translation: string }>,
  targetLang: string,
  model: string,
): void {
  void ensureHydrated().then(() => {
    for (const entry of entries) {
      const key = buildCacheKey(entry.text, targetLang, model);
      rememberInMemory(key, entry.translation);
      pendingWrites.set(key, entry.translation);
    }
    schedulePersist();
  });
}

export async function clearTranslationCache(): Promise<void> {
  memoryCache.clear();
  pendingWrites.clear();
  pendingTouches.clear();
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
  }
  hydrated = false;
  await clearStore();
  await clearSummaryCache();
}
