import { buildCacheKey } from '@/features/translate/cache-key';
import {
  getManyFromStore,
  setManyInStore,
  trimMemoryCache,
} from '@/features/translate/cache-store';
import { normalizeCacheText } from '@/features/translate/text-normalize';

const memoryCache = new Map<string, string>();
let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 250;
const pendingWrites = new Map<string, string>();

async function ensureHydrated(): Promise<void> {
  if (hydrated) {
    return;
  }
  hydrated = true;
}

function rememberInMemory(key: string, translation: string): void {
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

async function flushPendingWrites(): Promise<void> {
  if (pendingWrites.size === 0) {
    return;
  }
  const batch = new Map(pendingWrites);
  pendingWrites.clear();
  await setManyInStore(batch);
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

  for (const text of texts) {
    const normalized = normalizeCacheText(text);
    if (keyByText.has(normalized)) {
      continue;
    }
    const key = buildCacheKey(normalized, targetLang, model);
    keyByText.set(normalized, key);
    if (!memoryCache.has(key)) {
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

export function clearTranslationCache(): void {
  memoryCache.clear();
  pendingWrites.clear();
  hydrated = false;
}
