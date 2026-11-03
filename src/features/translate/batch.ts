import type { TextChunk } from '@/features/translate/types';
import { isLikelyDateText, normalizeCacheText } from '@/features/translate/text-normalize';
import {
  TRANSLATE_BATCH_MAX_CHARS,
  TRANSLATE_BATCH_SIZE,
  TRANSLATE_BULK_BATCH_MAX_CHARS,
  TRANSLATE_BULK_BATCH_SIZE,
  TRANSLATE_BULK_INCREMENTAL_BATCH_MAX_CHARS,
  TRANSLATE_BULK_INCREMENTAL_BATCH_SIZE,
} from '@/shared/constants';
import type { TranslationMode } from '@/shared/translation-mode';

export type BatchPackOptions = {
  maxItems: number;
  maxChars: number;
  useFastLane: boolean;
};

export type BatchPackContext = {
  incremental?: boolean;
};

export function getBatchPackOptions(
  mode: TranslationMode,
  context: BatchPackContext = {},
): BatchPackOptions {
  if (mode === 'bulk' && context.incremental) {
    return {
      maxItems: TRANSLATE_BULK_INCREMENTAL_BATCH_SIZE,
      maxChars: TRANSLATE_BULK_INCREMENTAL_BATCH_MAX_CHARS,
      useFastLane: true,
    };
  }
  if (mode === 'bulk') {
    return {
      maxItems: TRANSLATE_BULK_BATCH_SIZE,
      maxChars: TRANSLATE_BULK_BATCH_MAX_CHARS,
      useFastLane: true,
    };
  }
  return {
    maxItems: TRANSLATE_BATCH_SIZE,
    maxChars: TRANSLATE_BATCH_MAX_CHARS,
    useFastLane: true,
  };
}

export function createIdMap(texts: string[]): TextChunk[] {
  return texts.map((text, index) => ({
    id: String(index),
    text,
  }));
}

export function applyTranslations(
  originals: TextChunk[],
  translations: TextChunk[],
): Map<string, string> {
  const byId = new Map(translations.map((item) => [item.id, item.text]));
  const result = new Map<string, string>();

  for (const original of originals) {
    const translated = byId.get(original.id);
    if (typeof translated === 'string') {
      result.set(original.id, translated);
    }
  }

  return result;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }

  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

const URL_PATTERN = /^https?:\/\/\S+$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NON_LETTER_PATTERN = /^[\d\s\p{P}\p{S}]+$/u;

export function shouldTranslateText(
  text: string,
  minLength: number,
): boolean {
  const trimmed = normalizeCacheText(text);
  if (trimmed.length < minLength) {
    return false;
  }
  if (URL_PATTERN.test(trimmed) || EMAIL_PATTERN.test(trimmed)) {
    return false;
  }
  if (NON_LETTER_PATTERN.test(trimmed)) {
    return false;
  }
  if (isLikelyDateText(trimmed)) {
    return false;
  }
  return true;
}

export type DedupeResult = {
  unique: TextChunk[];
  expand: Map<string, string[]>;
};

export function dedupeTextChunks(chunks: TextChunk[]): DedupeResult {
  const unique: TextChunk[] = [];
  const expand = new Map<string, string[]>();
  const firstIdByText = new Map<string, string>();

  for (const chunk of chunks) {
    const normalized = normalizeCacheText(chunk.text);
    const existingId = firstIdByText.get(normalized);
    if (!existingId) {
      firstIdByText.set(normalized, chunk.id);
      unique.push({
        id: chunk.id,
        text: normalized,
        ...(chunk.sourceLang ? { sourceLang: chunk.sourceLang } : {}),
      });
      expand.set(chunk.id, [chunk.id]);
      continue;
    }
    const ids = expand.get(existingId);
    if (ids) {
      ids.push(chunk.id);
    }
  }

  return { unique, expand };
}

export function expandTranslations(
  uniqueTranslations: TextChunk[],
  expand: Map<string, string[]>,
): TextChunk[] {
  const result: TextChunk[] = [];
  for (const item of uniqueTranslations) {
    const ids = expand.get(item.id) ?? [item.id];
    for (const id of ids) {
      result.push({ id, text: item.text });
    }
  }
  return result;
}

export function packBatchesByBudget(
  chunks: TextChunk[],
  maxItems: number,
  maxChars: number,
): TextChunk[][] {
  if (chunks.length === 0) {
    return [];
  }

  const batches: TextChunk[][] = [];
  let current: TextChunk[] = [];
  let currentChars = 0;

  for (const chunk of chunks) {
    const nextChars = currentChars + chunk.text.length;
    const exceedsItems = current.length >= maxItems;
    const exceedsChars = current.length > 0 && nextChars > maxChars;

    if (exceedsItems || exceedsChars) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(chunk);
    currentChars += chunk.text.length;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}

export function splitFastFirstBatch(
  chunks: TextChunk[],
  maxItems: number,
  maxChars: number,
): { fast: TextChunk[]; rest: TextChunk[] } {
  if (chunks.length === 0) {
    return { fast: [], rest: [] };
  }

  const fast: TextChunk[] = [];
  let chars = 0;

  for (const chunk of chunks) {
    if (fast.length >= maxItems) {
      break;
    }
    if (fast.length > 0 && chars + chunk.text.length > maxChars) {
      break;
    }
    fast.push(chunk);
    chars += chunk.text.length;
  }

  if (fast.length === 0) {
    return { fast: [chunks[0]], rest: chunks.slice(1) };
  }

  const fastIds = new Set(fast.map((chunk) => chunk.id));
  const rest = chunks.filter((chunk) => !fastIds.has(chunk.id));
  return { fast, rest };
}

const FAST_FIRST_CANDIDATE_WINDOW = 8;

export function pickFastFirstBatch(
  chunks: TextChunk[],
  maxItems: number,
  maxChars: number,
): { fast: TextChunk[]; rest: TextChunk[] } {
  if (chunks.length === 0) {
    return { fast: [], rest: [] };
  }

  const windowSize = Math.min(chunks.length, Math.max(maxItems * 4, FAST_FIRST_CANDIDATE_WINDOW));
  const candidates = chunks
    .slice(0, windowSize)
    .slice()
    .sort((left, right) => left.text.length - right.text.length);
  const { fast } = splitFastFirstBatch(candidates, maxItems, maxChars);
  if (fast.length === 0) {
    return { fast: [chunks[0]], rest: chunks.slice(1) };
  }

  const fastIds = new Set(fast.map((chunk) => chunk.id));
  const rest = chunks.filter((chunk) => !fastIds.has(chunk.id));
  return { fast, rest };
}
