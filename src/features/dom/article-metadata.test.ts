import { describe, expect, it } from 'vitest';
import { hasArticleMetadata } from '@/features/dom/article-metadata';

function jsonLd(value: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
}

describe('hasArticleMetadata', () => {
  it('detects Open Graph article type', () => {
    document.head.innerHTML = '<meta property="og:type" content="article">';
    document.body.innerHTML = '';
    expect(hasArticleMetadata(document)).toBe(true);
  });

  it('detects article published time meta', () => {
    document.head.innerHTML = '<meta property="article:published_time" content="2026-07-23T10:00:00Z">';
    document.body.innerHTML = '';
    expect(hasArticleMetadata(document)).toBe(true);
  });

  it('detects JSON-LD article types including @graph', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = jsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: 'Example' },
        { '@type': 'NewsArticle', headline: 'Story' },
      ],
    });
    expect(hasArticleMetadata(document)).toBe(true);
  });

  it('ignores non-article pages and malformed JSON-LD', () => {
    document.head.innerHTML = '<meta property="og:type" content="website">';
    document.body.innerHTML = jsonLd({ '@type': 'CollectionPage' })
      + '<script type="application/ld+json">{not valid json</script>';
    expect(hasArticleMetadata(document)).toBe(false);
  });
});
