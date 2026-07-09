import { normalizeCacheText } from '@/features/translate/text-normalize';

const LONG_TEXT_THRESHOLD = 240;
const KEY_SEPARATOR = '\u001f';

export function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildCacheKey(
  text: string,
  targetLang: string,
  model: string,
): string {
  const normalized = normalizeCacheText(text);
  const prefix = `${model}${KEY_SEPARATOR}${targetLang}${KEY_SEPARATOR}`;
  if (normalized.length <= LONG_TEXT_THRESHOLD) {
    return `${prefix}${normalized}`;
  }
  return `${prefix}${hashText(normalized)}`;
}
