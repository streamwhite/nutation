import type { TextChunk } from '@/features/translate/types';

const MIN_SOURCE_CHARS_FOR_TRUNCATION_CHECK = 60;
const MIN_TRANSLATION_RATIO = 0.22;

export function isLikelyTruncatedTranslation(source: string, translation: string): boolean {
  const sourceText = source.trim();
  const translated = translation.trim();
  if (!translated || sourceText.length < MIN_SOURCE_CHARS_FOR_TRUNCATION_CHECK) {
    return false;
  }

  return translated.length < Math.ceil(sourceText.length * MIN_TRANSLATION_RATIO);
}

export function findIncompleteTranslationIds(
  source: TextChunk[],
  translations: TextChunk[],
): string[] {
  const byId = new Map(translations.map((item) => [item.id, item.text]));
  const incomplete: string[] = [];

  for (const item of source) {
    const translated = byId.get(item.id);
    if (typeof translated !== 'string' || !translated.trim()) {
      incomplete.push(item.id);
      continue;
    }
    if (isLikelyTruncatedTranslation(item.text, translated)) {
      incomplete.push(item.id);
    }
  }

  return incomplete;
}

export function mergeTranslations(
  source: TextChunk[],
  batches: TextChunk[][],
): TextChunk[] {
  const byId = new Map<string, string>();
  for (const batch of batches) {
    for (const item of batch) {
      byId.set(item.id, item.text);
    }
  }

  const merged: TextChunk[] = [];
  for (const item of source) {
    const text = byId.get(item.id);
    if (typeof text === 'string' && text.trim()) {
      merged.push({ id: item.id, text });
    }
  }
  return merged;
}
