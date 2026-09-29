import {
  ESTIMATED_AVG_CACHE_ENTRY_BYTES,
  TRANSLATION_CACHE_ENTRIES_HARD_LIMIT,
  TRANSLATION_CACHE_MAX_ENTRIES,
  TRANSLATION_CACHE_MIN_ENTRIES,
} from '@/shared/constants';

function toFiniteNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveCacheMaxEntries(
  raw: unknown,
  fallback = TRANSLATION_CACHE_MAX_ENTRIES,
): number {
  const value = toFiniteNumber(raw);
  if (value === null) {
    return fallback;
  }
  const rounded = Math.round(value);
  return Math.min(
    TRANSLATION_CACHE_ENTRIES_HARD_LIMIT,
    Math.max(TRANSLATION_CACHE_MIN_ENTRIES, rounded),
  );
}

export function estimateCacheCapacityBytes(maxEntries: number): number {
  return resolveCacheMaxEntries(maxEntries) * ESTIMATED_AVG_CACHE_ENTRY_BYTES;
}
