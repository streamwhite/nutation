import type { TextChunk } from '@/features/translate/types';

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
