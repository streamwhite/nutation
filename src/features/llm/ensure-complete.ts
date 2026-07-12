import {
  findIncompleteTranslationIds,
  mergeTranslations,
} from '@/features/llm/translation-complete';
import { TranslationRequestError } from '@/features/llm/retry';
import { packBatchesByBudget } from '@/features/translate/batch';
import type { TextChunk } from '@/features/translate/types';
import {
  TRANSLATE_BATCH_MAX_CHARS,
  TRANSLATE_BATCH_SIZE,
} from '@/shared/constants';

const MAX_COMPLETION_PASSES = 2;

async function translatePending(
  pending: TextChunk[],
  translate: (batch: TextChunk[]) => Promise<TextChunk[]>,
  useFollowUpPacks: boolean,
): Promise<TextChunk[]> {
  if (!useFollowUpPacks) {
    return translate(pending);
  }

  const packs = packBatchesByBudget(
    pending,
    TRANSLATE_BATCH_SIZE,
    TRANSLATE_BATCH_MAX_CHARS,
  );
  const results = await Promise.all(packs.map((pack) => translate(pack)));
  return results.flat();
}

export async function ensureCompleteTranslations(
  texts: TextChunk[],
  translate: (batch: TextChunk[]) => Promise<TextChunk[]>,
): Promise<TextChunk[]> {
  if (texts.length === 0) {
    return [];
  }

  const collected: TextChunk[][] = [];
  let pending = texts;

  for (let pass = 0; pass < MAX_COMPLETION_PASSES; pass += 1) {
    const useFollowUpPacks = pass > 0;
    const batch = await translatePending(pending, translate, useFollowUpPacks);
    collected.push(batch);

    const merged = mergeTranslations(texts, collected);
    const incompleteIds = findIncompleteTranslationIds(texts, merged);
    if (incompleteIds.length === 0) {
      return merged;
    }

    const incomplete = new Set(incompleteIds);
    pending = texts.filter((item) => incomplete.has(item.id));
  }

  const merged = mergeTranslations(texts, collected);
  const incompleteIds = findIncompleteTranslationIds(texts, merged);
  const missingCount = incompleteIds.filter((id) => !merged.some((item) => item.id === id)).length;
  if (missingCount > 0 && merged.length === 0) {
    throw new TranslationRequestError(
      `Missing translations for ${missingCount} items`,
      null,
      true,
    );
  }
  return merged;
}
