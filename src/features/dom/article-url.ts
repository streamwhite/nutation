import {
  ARTICLE_PATH_SEGMENTS,
  LISTING_PATH_SEGMENTS,
  LISTING_QUERY_PARAMS,
} from '@/shared/constants';

const YEAR = '(?:19|20)\\d{2}';
const MONTH = '(?:0?[1-9]|1[0-2])';
const DAY = '(?:0?[1-9]|[12]\\d|3[01])';
const SLUG = '[^/?#]*[a-z][^/?#]*';

const ARTICLE_URL_PATTERNS = [
  new RegExp(`/${YEAR}/${MONTH}(?:/${DAY})?/${SLUG}`, 'i'),
  new RegExp(`/${YEAR}-${MONTH}-${DAY}${SLUG}`, 'i'),
  // Numeric-id permalinks such as /23843319/apple-vision-pro-review.
  new RegExp(`/\\d{4,}/${SLUG}`, 'i'),
  // Section keywords such as /news/some-story or /blog/how-we-scaled.
  new RegExp(`/(?:${ARTICLE_PATH_SEGMENTS.join('|')})/${SLUG}`, 'i'),
];

const LISTING_SEGMENT_SET = new Set<string>(LISTING_PATH_SEGMENTS);
const LISTING_QUERY_SET = new Set<string>(LISTING_QUERY_PARAMS);

function parseUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

export function isLikelyArticleUrl(rawUrl: string): boolean {
  const url = parseUrl(rawUrl);
  if (!url) {
    return false;
  }
  return ARTICLE_URL_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

export function isLikelyListingUrl(rawUrl: string): boolean {
  const url = parseUrl(rawUrl);
  if (!url) {
    return false;
  }
  for (const key of url.searchParams.keys()) {
    if (LISTING_QUERY_SET.has(key)) {
      return true;
    }
  }
  const segments = url.pathname.toLowerCase().split('/').filter(Boolean);
  return segments.some((segment) => LISTING_SEGMENT_SET.has(segment));
}
