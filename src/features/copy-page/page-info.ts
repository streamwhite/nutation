import {
  PAGE_INFO_SEPARATOR,
  TRACKING_QUERY_PARAM_PREFIXES,
  TRACKING_QUERY_PARAMS,
} from '@/shared/constants';

export type PageInfo = {
  title: string;
  description: string;
  link: string;
};

const TITLE_META_SELECTORS = [
  'meta[property="og:title"]',
  'meta[name="twitter:title"]',
];

const DESCRIPTION_META_SELECTORS = [
  'meta[name="description"]',
  'meta[property="og:description"]',
  'meta[name="twitter:description"]',
];

export function isTrackingQueryParam(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  if (TRACKING_QUERY_PARAMS.has(normalized)) {
    return true;
  }
  return TRACKING_QUERY_PARAM_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function stripTrackingParams(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const remove = Array.from(parsed.searchParams.keys()).filter(isTrackingQueryParam);
  for (const key of remove) {
    parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

function readMetaContent(doc: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const content = doc.querySelector<HTMLMetaElement>(selector)?.content?.trim();
    if (content) {
      return content;
    }
  }
  return '';
}

export function readPageTitle(doc: Document = document): string {
  const title = doc.title?.trim() ?? '';
  return title || readMetaContent(doc, TITLE_META_SELECTORS);
}

export function readPageDescription(doc: Document = document): string {
  return readMetaContent(doc, DESCRIPTION_META_SELECTORS);
}

export function readPageLink(doc: Document = document, includeLink = true): string {
  if (!includeLink) {
    return '';
  }
  const canonical = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href?.trim();
  const raw = canonical || doc.location?.href || '';
  return raw ? stripTrackingParams(raw) : '';
}

export function readPageInfo(doc: Document = document, includeLink = true): PageInfo {
  return {
    title: readPageTitle(doc),
    description: readPageDescription(doc),
    link: readPageLink(doc, includeLink),
  };
}

const SEPARATOR_ESCAPE_PATTERN = /\\n|\\t/g;
const SEPARATOR_ESCAPES: Record<string, string> = {
  '\\n': '\n',
  '\\t': '\t',
};

export function decodeSeparator(raw: string): string {
  return raw.replace(SEPARATOR_ESCAPE_PATTERN, (match) => SEPARATOR_ESCAPES[match] ?? match);
}

export function formatPageInfo(
  info: PageInfo,
  separator: string = PAGE_INFO_SEPARATOR,
): string {
  return [info.title, info.description, info.link]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(decodeSeparator(separator));
}
