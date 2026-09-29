import { describe, expect, it } from 'vitest';
import { isLikelyArticleUrl } from '@/features/dom/article-url';

describe('isLikelyArticleUrl', () => {
  it('detects date-based article permalinks', () => {
    expect(isLikelyArticleUrl(
      'https://techcrunch.com/2026/07/23/how-ai-guardrails-are-impeding-the-work-of-offensive-cybersecurity-researchers/',
    )).toBe(true);
    expect(isLikelyArticleUrl('https://example.com/2026/07/some-post/')).toBe(true);
    expect(isLikelyArticleUrl('https://example.com/blog/2026-07-23-release-notes.html')).toBe(true);
  });

  it('rejects home, section, archive pages and invalid urls', () => {
    expect(isLikelyArticleUrl('https://techcrunch.com/')).toBe(false);
    expect(isLikelyArticleUrl('https://techcrunch.com/category/ai/')).toBe(false);
    expect(isLikelyArticleUrl('https://example.com/2026/07/')).toBe(false);
    expect(isLikelyArticleUrl('https://example.com/2026-07-23/')).toBe(false);
    expect(isLikelyArticleUrl('not a url')).toBe(false);
  });
});
