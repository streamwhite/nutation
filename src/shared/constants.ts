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
  'publish-date',
  'published-date',
  'publish-time',
  'published-at',
  'post-date',
  'entry-date',
  'article-date',
  'post-time',
  'entry-time',
  'article-time',
  'timestamp',
  'date',
  'datetime',
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

export const HEADLINE_CLASS_TOKENS = [
  'headline',
  'page-headline',
  'article-title',
  'post-title',
  'entry-title',
  'story-headline',
  'article-headline',
] as const;

export const HEADING_TAG_NAMES = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);

export const MAIN_CONTENT_SELECTORS = [
  'main',
  '[role="main"]',
  '#content',
  '#main',
  '#main-content',
  '.main-content',
  '.post-content',
  '.entry-content',
  '.article-content',
] as const;

export const MIN_HEADLINE_FEED_COUNT = 3;

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
export const TRANSLATE_BATCH_SIZE = 6;
export const TRANSLATE_BATCH_MAX_CHARS = 700;
export const TRANSLATE_FAST_LANE_BATCH_SIZE = 1;
export const TRANSLATE_FAST_LANE_MAX_CHARS = 120;
export const TRANSLATE_CONCURRENCY = 10;
export const API_MAX_TOKENS_FLOOR = 512;
export const API_MAX_TOKENS_CEILING = 65_536;
export const API_MAX_TOKENS_CHAR_RATIO = 2;
export const API_MAX_TOKENS_OVERHEAD = 256;
export const GEMINI_THINKING_LEVEL = 'minimal' as const;
// Pro models only accept 'low' | 'high' for thinking_level.
export const GEMINI_PRO_THINKING_LEVEL = 'low' as const;
export const GEMINI_PRO_MODEL_PATTERN = /-pro\b/;
export const TRANSLATE_BULK_BATCH_SIZE = 40;
export const TRANSLATE_BULK_BATCH_MAX_CHARS = 2_400;
export const TRANSLATE_BULK_INCREMENTAL_BATCH_SIZE = 6;
export const TRANSLATE_BULK_INCREMENTAL_BATCH_MAX_CHARS = 700;

export const GEMINI_API_REVISION = '2026-05-20';
export const TRANSLATE_MAX_RETRIES = 3;
export const TRANSLATE_RETRY_BASE_DELAY_MS = 800;
export const TRANSLATE_BATCH_FAILURE_DELAY_MS = 2000;
export const RETRYABLE_HTTP_STATUSES = [429, 502, 503, 504] as const;
export const MIN_TRANSLATE_TEXT_LENGTH = 2;
export const INTERSECTION_ROOT_MARGIN = '400px';
export const MEMORY_CACHE_MAX_ENTRIES = 800;
export const TRANSLATION_CACHE_MAX_ENTRIES = 1_000_000;
export const TRANSLATION_CACHE_MIN_ENTRIES = 1_000;
export const TRANSLATION_CACHE_ENTRIES_HARD_LIMIT = 5_000_000;
export const ESTIMATED_AVG_CACHE_ENTRY_BYTES = 320;
export const TRANSLATION_CACHE_DB_NAME = 'page-translate-cache';
export const TRANSLATION_CACHE_STORE_NAME = 'translations';
export const SUMMARY_CACHE_STORE_NAME = 'summaries';
export const SUMMARY_CACHE_STORAGE_PREFIX = 'summary-cache:';
export const SUMMARY_CACHE_MAX_ENTRIES = 2_000;
export const SUMMARY_CACHE_ENTRIES_HARD_LIMIT = 20_000;
export const SUMMARY_CACHE_DB_VERSION = 2;
export const SUMMARY_MEMORY_CACHE_MAX_ENTRIES = 100;
export const CACHE_LRU_TOUCH_DEBOUNCE_MS = 250;

export const CONTENT_SCRIPT_RETRY_DELAY_MS = 150;
export const CONTENT_SCRIPT_PING_ATTEMPTS = 10;
export const CONTENT_SCRIPT_PING_INTERVAL_MS = 250;
export const CONTENT_SCRIPT_INJECT_WARMUP_MS = 400;
export const TAB_RELOAD_TIMEOUT_MS = 30000;

export const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';
export const CONTENT_SCRIPT_REGISTRATION_ID = 'page-translate-content';

export const MESSAGE_TYPES = {
  TRANSLATE_BATCH: 'TRANSLATE_BATCH',
  WARM_PROVIDER: 'WARM_PROVIDER',
  PERSIST_TRANSLATIONS: 'PERSIST_TRANSLATIONS',
  GET_STATUS: 'GET_STATUS',
  START_TRANSLATE: 'START_TRANSLATE',
  STOP_TRANSLATE: 'STOP_TRANSLATE',
  GET_TAB_STATUS: 'GET_TAB_STATUS',
  ENSURE_CONTENT_SCRIPT: 'ENSURE_CONTENT_SCRIPT',
  SUMMARIZE_PAGE: 'SUMMARIZE_PAGE',
  SUMMARIZE_TEXT: 'SUMMARIZE_TEXT',
  COPY_PAGE_INFO: 'COPY_PAGE_INFO',
} as const;

export const PAGE_INFO_SEPARATOR = ':';

// Query params stripped from copied page links: utm_* plus common ad/click ids.
export const TRACKING_QUERY_PARAM_PREFIXES = ['utm_'] as const;
export const TRACKING_QUERY_PARAMS = new Set([
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'dclid',
  'twclid',
  'yclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'ref_src',
  'srsltid',
  '_hsenc',
  '_hsmi',
]);

export const SUMMARIZE_OVERLAY_ROOT_ID = 'page-translate-summary-overlay';
export const SUMMARIZE_PREFS_STORAGE_KEY = 'page-translate-summary-prefs';
export const SUMMARIZE_MAX_CHARS_DEFAULT = 60_000;
export const SUMMARIZE_MAX_OUTPUT_TOKENS = 2_048;

export const CONTEXT_MENU_TRANSLATE_ID = 'page-translate-translate-page';
export const CONTEXT_MENU_TRANSLATE_TITLE = 'Translate page';

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
} as const;

export const POPUP_STATUS_POLL_MS = 400;
export const TIMING_LOG_PREFIX = '[PageTranslate:timing]';

export const OPENCC_T2S_FROM = 'twp';
export const OPENCC_T2S_TO = 'cn';
export const OPENCC_S2T_FROM = 'cn';
export const OPENCC_S2T_TO = 'twp';
export const OPENCC_S2T_HK_TO = 'hk';
export const OPENCC_CACHE_MODEL_T2S = 'opencc-tw2sp';
export const OPENCC_CACHE_MODEL_S2T = 'opencc-cn2twp';
export const OPENCC_CACHE_MODEL_S2T_HK = 'opencc-cn2hk';
export const SIMPLIFIED_CHINESE_LANG_TAGS = [
  'zh-cn',
  'zh-hans',
  'zh-hans-cn',
  'zh-chs',
  'zh-simplified',
  'zh-sg',
  'zh-my',
] as const;

export const TRADITIONAL_CHINESE_LANG_TAGS = [
  'zh-tw',
  'zh-hk',
  'zh-mo',
  'zh-hant',
  'zh-hant-tw',
  'zh-hant-hk',
  'zh-hant-mo',
  'zh-cht',
  'zh-traditional',
] as const;