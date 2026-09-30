import Fuse from 'fuse.js';
import { TARGET_LANGUAGES, type TargetLanguage } from '@/shared/languages';

export const LANGUAGE_SEARCH_LIMIT = 12;

const fuse = new Fuse(TARGET_LANGUAGES, {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'nativeName', weight: 0.3 },
    { name: 'code', weight: 0.2 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
});

export function searchTargetLanguages(query: string): TargetLanguage[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return TARGET_LANGUAGES.slice(0, LANGUAGE_SEARCH_LIMIT);
  }
  return fuse.search(trimmed, { limit: LANGUAGE_SEARCH_LIMIT }).map((result) => result.item);
}
