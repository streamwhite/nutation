export const SKIP_TAG_NAMES = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'CODE',
  'PRE',
  'SVG',
  'MATH',
]);

export const MUTATION_DEBOUNCE_MS = 200;
export const TRANSLATE_BATCH_SIZE = 20;
export const TRANSLATE_CONCURRENCY = 3;
export const INTERSECTION_ROOT_MARGIN = '200px';

export const MESSAGE_TYPES = {
  TRANSLATE_BATCH: 'TRANSLATE_BATCH',
  GET_STATUS: 'GET_STATUS',
  START_TRANSLATE: 'START_TRANSLATE',
  STOP_TRANSLATE: 'STOP_TRANSLATE',
  GET_TAB_STATUS: 'GET_TAB_STATUS',
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  TRANSLATION_CACHE: 'translationCache',
} as const;
