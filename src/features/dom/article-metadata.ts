import { ARTICLE_SCHEMA_TYPES } from '@/shared/constants';

const ARTICLE_SCHEMA_TYPE_SET = new Set<string>(ARTICLE_SCHEMA_TYPES);

const JSON_LD_CHILD_KEYS = ['@graph', 'mainEntity', 'mainEntityOfPage'] as const;

function metaContent(doc: Document, selectors: string): string | null {
  return doc.querySelector(selectors)?.getAttribute('content')?.trim().toLowerCase() ?? null;
}

function isOpenGraphArticle(doc: Document): boolean {
  return metaContent(doc, 'meta[property="og:type"]') === 'article';
}

function hasArticleTimeMeta(doc: Document): boolean {
  return ['article:published_time', 'article:modified_time'].some((property) => (
    doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`) !== null
  ));
}

function normalizeSchemaType(type: unknown): string | null {
  if (typeof type !== 'string') {
    return null;
  }
  return type.split(/[/#]/).pop() ?? null;
}

function collectSchemaTypes(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaTypes(item, out));
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }
  const record = value as Record<string, unknown>;
  const type = record['@type'];
  for (const item of Array.isArray(type) ? type : [type]) {
    const normalized = normalizeSchemaType(item);
    if (normalized) {
      out.add(normalized);
    }
  }
  for (const key of JSON_LD_CHILD_KEYS) {
    if (key in record) {
      collectSchemaTypes(record[key], out);
    }
  }
}

function hasArticleJsonLd(doc: Document): boolean {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }
    const types = new Set<string>();
    collectSchemaTypes(parsed, types);
    if ([...types].some((type) => ARTICLE_SCHEMA_TYPE_SET.has(type))) {
      return true;
    }
  }
  return false;
}

export function hasArticleMetadata(doc: Document = document): boolean {
  return isOpenGraphArticle(doc) || hasArticleTimeMeta(doc) || hasArticleJsonLd(doc);
}
