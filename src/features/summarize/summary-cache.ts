import { hashText } from '@/features/translate/cache-key';
import {
  SUMMARY_CACHE_ENTRIES_HARD_LIMIT,
  SUMMARY_CACHE_MAX_ENTRIES,
  SUMMARY_CACHE_STORAGE_PREFIX,
  SUMMARY_MEMORY_CACHE_MAX_ENTRIES,
} from '@/shared/constants';
import { browser } from 'wxt/browser';

const KEY_SEPARATOR = '\u001f';
const memoryCache = new Map<string, string>();

type StoredSummary = {
  summary: string;
  usedAt: number;
};

function resolveSummaryCacheMaxEntries(): number {
  const raw = import.meta.env.VITE_SUMMARY_CACHE_MAX_ENTRIES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return SUMMARY_CACHE_MAX_ENTRIES;
  }
  return Math.min(SUMMARY_CACHE_ENTRIES_HARD_LIMIT, Math.round(parsed));
}

function storageKeyFor(cacheKey: string): string {
  return `${SUMMARY_CACHE_STORAGE_PREFIX}${cacheKey}`;
}

function trimSummaryMemoryCache(): void {
  while (memoryCache.size > SUMMARY_MEMORY_CACHE_MAX_ENTRIES) {
    const firstKey = memoryCache.keys().next().value;
    if (!firstKey) {
      break;
    }
    memoryCache.delete(firstKey);
  }
}

function rememberInMemory(key: string, summary: string): void {
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  }
  memoryCache.set(key, summary);
  trimSummaryMemoryCache();
}

function isStoredSummary(value: unknown): value is StoredSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Partial<StoredSummary>;
  return typeof record.summary === 'string' && record.summary.length > 0
    && typeof record.usedAt === 'number';
}

export function normalizePageCacheUrl(pageUrl: string): string {
  const trimmed = pageUrl.trim();
  if (!trimmed) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    parsed.hash = '';
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch (error) {
    console.error('Failed to normalize page cache url.', error);
    return trimmed;
  }
}

export function buildSummaryCacheKey(
  pageUrl: string,
  targetLang: string,
  model: string,
): string {
  const urlKey = hashText(normalizePageCacheUrl(pageUrl));
  return `${model}${KEY_SEPARATOR}${targetLang}${KEY_SEPARATOR}${urlKey}`;
}

async function listSummaryStorageEntries(): Promise<Array<{ key: string; usedAt: number }>> {
  const all = await browser.storage.local.get(null);
  const entries: Array<{ key: string; usedAt: number }> = [];
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(SUMMARY_CACHE_STORAGE_PREFIX) || !isStoredSummary(value)) {
      continue;
    }
    entries.push({ key, usedAt: value.usedAt });
  }
  return entries;
}

async function trimSummaryStorage(): Promise<void> {
  const maxEntries = resolveSummaryCacheMaxEntries();
  const entries = await listSummaryStorageEntries();
  const overflow = entries.length - maxEntries;
  if (overflow <= 0) {
    return;
  }
  entries.sort((left, right) => left.usedAt - right.usedAt);
  const removeKeys = entries.slice(0, overflow).map((entry) => entry.key);
  await browser.storage.local.remove(removeKeys);
}

export async function getCachedSummary(
  pageUrl: string,
  targetLang: string,
  model: string,
): Promise<string | null> {
  if (!pageUrl.trim()) {
    return null;
  }
  const key = buildSummaryCacheKey(pageUrl, targetLang, model);
  const memoryHit = memoryCache.get(key);
  if (memoryHit) {
    rememberInMemory(key, memoryHit);
    return memoryHit;
  }

  const storageKey = storageKeyFor(key);
  try {
    const result = await browser.storage.local.get(storageKey);
    const entry = result[storageKey];
    if (!isStoredSummary(entry)) {
      return null;
    }
    rememberInMemory(key, entry.summary);
    void browser.storage.local.set({
      [storageKey]: { summary: entry.summary, usedAt: Date.now() },
    }).catch((error: unknown) => {
      console.error('Failed to touch summary cache entry.', error);
    });
    return entry.summary;
  } catch (error) {
    console.error('Failed to read summary cache.', error);
    return null;
  }
}

export async function setCachedSummary(
  pageUrl: string,
  targetLang: string,
  model: string,
  summary: string,
): Promise<void> {
  if (!pageUrl.trim() || !summary.trim()) {
    return;
  }
  const key = buildSummaryCacheKey(pageUrl, targetLang, model);
  rememberInMemory(key, summary);
  try {
    await browser.storage.local.set({
      [storageKeyFor(key)]: { summary, usedAt: Date.now() },
    });
    await trimSummaryStorage();
  } catch (error) {
    console.error('Failed to write summary cache.', error);
  }
}

export async function clearSummaryCache(): Promise<void> {
  memoryCache.clear();
  try {
    const entries = await listSummaryStorageEntries();
    if (entries.length === 0) {
      return;
    }
    await browser.storage.local.remove(entries.map((entry) => entry.key));
  } catch (error) {
    console.error('Failed to clear summary cache store.', error);
  }
}
