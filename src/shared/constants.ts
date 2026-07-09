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

export const CHROME_TAG_NAMES = new Set([
  'NAV',
  'HEADER',
  'FOOTER',
  'ASIDE',
  'MENU',
]);

export const CHROME_ROLE_NAMES = new Set([
  'navigation',
  'banner',
  'contentinfo',
  'complementary',
  'search',
  'menubar',
  'toolbar',
]);

export const METADATA_TAG_NAMES = new Set([
  'TIME',
]);

export const METADATA_ROLE_NAMES = new Set([
  'doc-subtitle',
]);

export const METADATA_CLASS_TOKENS = [
  'author',
  'byline',
  'post-author',
  'entry-author',
  'article-author',
  'writer',
  'posted-by',
  'publish',
  'published',
  'post-date',
  'entry-date',
  'article-date',
  'post-time',
  'entry-time',
  'article-time',
  'timestamp',
  'date',
  'datetime',
  'meta',
  'post-meta',
  'entry-meta',
  'article-meta',
  'breadcrumb',
  'breadcrumbs',
  'post-tags',
  'entry-tags',
  'article-tags',
  'tag-list',
  'category-list',
  'reading-time',
  'read-time',
] as const;

export const SHARE_CLASS_TOKENS = [
  'share',
  'sharing',
  'social-share',
  'social-buttons',
  'share-buttons',
  'share-icons',
  'social-icons',
] as const;

export const SHARE_LABEL_PATTERN = /\bshare\b|\btweet\b|\bpin\b|\bfollow\b/;

export const MAIN_CONTENT_SELECTORS = [
  'main',
  '[role="main"]',
  'article',
  '#content',
  '#main',
  '#main-content',
  '.main-content',
  '.post-content',
  '.entry-content',
  '.article-content',
] as const;

export const VISUALIZATION_EMBED_SELECTORS = [
  '[class*="fl-layout"]',
  '[id*="fl-layout"]',
  '[class*="flourish"]',
  '[data-flourish-id]',
  'iframe[src*="flo.uri.sh"]',
  'iframe[src*="flourish.studio"]',
] as const;

export const MUTATION_DEBOUNCE_MS = 200;
export const FLUSH_COALESCE_MS = 16;
export const QUEUE_VISIBLE_DEBOUNCE_MS = 250;
export const TRANSLATE_BATCH_SIZE = 16;
export const TRANSLATE_BATCH_MAX_CHARS = 1400;
export const TRANSLATE_FAST_LANE_BATCH_SIZE = 2;
export const TRANSLATE_FAST_LANE_MAX_CHARS = 200;
export const TRANSLATE_FAST_LANE_PARALLEL = 6;
export const TRANSLATE_CONCURRENCY = 10;
export const API_MAX_TOKENS_FLOOR = 64;
export const API_MAX_TOKENS_CEILING = 512;
export const API_MAX_TOKENS_CHAR_RATIO = 1.1;
export const TRANSLATE_MAX_RETRIES = 3;
export const TRANSLATE_RETRY_BASE_DELAY_MS = 800;
export const TRANSLATE_BATCH_FAILURE_DELAY_MS = 2000;
export const RETRYABLE_HTTP_STATUSES = [429, 502, 503, 504] as const;
export const MIN_TRANSLATE_TEXT_LENGTH = 2;
export const INTERSECTION_ROOT_MARGIN = '400px';
export const MEMORY_CACHE_MAX_ENTRIES = 800;
export const TRANSLATION_CACHE_MAX_ENTRIES = 50000;
export const TRANSLATION_CACHE_DB_NAME = 'page-translate-cache';
export const TRANSLATION_CACHE_STORE_NAME = 'translations';

export const CONTENT_SCRIPT_RETRY_DELAY_MS = 150;
export const CONTENT_SCRIPT_PING_ATTEMPTS = 10;
export const CONTENT_SCRIPT_PING_INTERVAL_MS = 250;
export const CONTENT_SCRIPT_INJECT_WARMUP_MS = 400;
export const TAB_RELOAD_TIMEOUT_MS = 30000;

export const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';
export const CONTENT_SCRIPT_REGISTRATION_ID = 'page-translate-content';

export const MESSAGE_TYPES = {
  TRANSLATE_BATCH: 'TRANSLATE_BATCH',
  PERSIST_TRANSLATIONS: 'PERSIST_TRANSLATIONS',
  GET_STATUS: 'GET_STATUS',
  START_TRANSLATE: 'START_TRANSLATE',
  STOP_TRANSLATE: 'STOP_TRANSLATE',
  GET_TAB_STATUS: 'GET_TAB_STATUS',
  ENSURE_CONTENT_SCRIPT: 'ENSURE_CONTENT_SCRIPT',
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
} as const;

export const POPUP_STATUS_POLL_MS = 400;
export const TIMING_LOG_PREFIX = '[PageTranslate:timing]';
