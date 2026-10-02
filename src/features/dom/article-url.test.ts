import { describe, expect, it } from 'vitest';
import { isLikelyArticleUrl, isLikelyListingUrl } from '@/features/dom/article-url';

describe('isLikelyArticleUrl', () => {
  it('detects date-based article permalinks', () => {
    expect(isLikelyArticleUrl(
      'https://techcrunch.com/2026/07/23/how-ai-guardrails-are-impeding-the-work-of-offensive-cybersecurity-researchers/',
    )).toBe(true);
    expect(isLikelyArticleUrl('https://example.com/2026/07/some-post/')).toBe(true);
    expect(isLikelyArticleUrl('https://example.com/blog/2026-07-23-release-notes.html')).toBe(true);
  });

  it('detects numeric-id and section-keyword article permalinks', () => {
    expect(isLikelyArticleUrl('https://www.theverge.com/23843319/apple-vision-pro-review')).toBe(true);
    expect(isLikelyArticleUrl('https://example.com/news/some-breaking-story')).toBe(true);
    expect(isLikelyArticleUrl('https://example.com/blog/how-we-scaled')).toBe(true);
    expect(isLikelyArticleUrl('https://example.com/article/why-rust')).toBe(true);
  });

  it('rejects home, section, archive pages and invalid urls', () => {
    expect(isLikelyArticleUrl('https://techcrunch.com/')).toBe(false);
    expect(isLikelyArticleUrl('https://techcrunch.com/category/ai/')).toBe(false);
    expect(isLikelyArticleUrl('https://example.com/2026/07/')).toBe(false);
    expect(isLikelyArticleUrl('https://example.com/2026-07-23/')).toBe(false);
    expect(isLikelyArticleUrl('not a url')).toBe(false);
  });
});

describe('isLikelyListingUrl', () => {
  it('detects aggregation and pagination paths', () => {
    expect(isLikelyListingUrl('https://techcrunch.com/category/ai/')).toBe(true);
    expect(isLikelyListingUrl('https://example.com/tag/openai')).toBe(true);
    expect(isLikelyListingUrl('https://example.com/author/jane-doe')).toBe(true);
    expect(isLikelyListingUrl('https://example.com/news/page/3/')).toBe(true);
    expect(isLikelyListingUrl('https://example.com/archive/2026/07/')).toBe(true);
  });

  it('detects pagination and search query strings', () => {
    expect(isLikelyListingUrl('https://example.com/tech/?page=2')).toBe(true);
    expect(isLikelyListingUrl('https://example.com/tech/?paged=3')).toBe(true);
    expect(isLikelyListingUrl('https://example.com/?s=ai+news')).toBe(true);
    expect(isLikelyListingUrl('https://example.com/?q=ai')).toBe(true);
  });

  it('does not flag article or plain urls', () => {
    expect(isLikelyListingUrl('https://techcrunch.com/')).toBe(false);
    expect(isLikelyListingUrl('https://example.com/tech')).toBe(false);
    expect(isLikelyListingUrl('https://www.theverge.com/23843319/apple-vision-pro-review')).toBe(false);
    expect(isLikelyListingUrl(
      'https://techcrunch.com/2026/07/23/how-ai-guardrails-are-impeding-researchers/',
    )).toBe(false);
    expect(isLikelyListingUrl('not a url')).toBe(false);
  });
});
