const YEAR = '(?:19|20)\\d{2}';
const MONTH = '(?:0?[1-9]|1[0-2])';
const DAY = '(?:0?[1-9]|[12]\\d|3[01])';
const SLUG = '[^/?#]*[a-z][^/?#]*';

const SLASH_DATE_ARTICLE_PATTERN = new RegExp(
  `/${YEAR}/${MONTH}(?:/${DAY})?/${SLUG}`,
  'i',
);
const DASH_DATE_ARTICLE_PATTERN = new RegExp(
  `/${YEAR}-${MONTH}-${DAY}${SLUG}`,
  'i',
);

// ponytail: only date-based permalinks count as article urls; numeric-id or
// query-string permalink forms are not detected. Extend patterns as needed.
export function isLikelyArticleUrl(rawUrl: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(rawUrl).pathname;
  } catch {
    return false;
  }
  return SLASH_DATE_ARTICLE_PATTERN.test(pathname)
    || DASH_DATE_ARTICLE_PATTERN.test(pathname);
}
