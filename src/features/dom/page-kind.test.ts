import { describe, expect, it } from 'vitest';
import { isLikelyListingFeed } from '@/features/dom/page-kind';

function feedHtml(): string {
  return `
    <main>
      <a href="/story-1"><h2>Story one headline here</h2></a>
      <p>${'Summary one '.repeat(8)}</p>
      <a href="/story-2"><h2>Story two headline here</h2></a>
      <p>${'Summary two '.repeat(8)}</p>
      <a href="/story-3"><h2>Story three headline here</h2></a>
      <p>${'Summary three '.repeat(8)}</p>
    </main>
  `;
}

function longArticleHtml(): string {
  return `
    <main>
      <h1>A long-form article title</h1>
      <h2>First section heading</h2>
      <p>${'Body paragraph text. '.repeat(30)}</p>
      <h2>Second section heading</h2>
      <p>${'More body paragraph text. '.repeat(30)}</p>
      <h2>Third section heading</h2>
      <p>${'Final body paragraph text. '.repeat(30)}</p>
    </main>
  `;
}

describe('isLikelyListingFeed', () => {
  it('flags feed-shaped DOM with linked headlines', () => {
    document.body.innerHTML = feedHtml();
    expect(isLikelyListingFeed(document, 'https://example.com/tech')).toBe(true);
  });

  it('flags aggregation URLs even with few headlines', () => {
    document.body.innerHTML = '<main><h1>Tech</h1><p>Short intro.</p></main>';
    expect(isLikelyListingFeed(document, 'https://example.com/category/tech/')).toBe(true);
  });

  it('does not flag long articles with section headings', () => {
    document.body.innerHTML = longArticleHtml();
    expect(isLikelyListingFeed(document, 'https://example.com/some/tech')).toBe(false);
  });

  it('trusts article metadata over feed-shaped DOM', () => {
    document.head.innerHTML = '<meta property="og:type" content="article">';
    document.body.innerHTML = feedHtml();
    expect(isLikelyListingFeed(document, 'https://example.com/tech')).toBe(false);
  });

  it('trusts article URLs over feed-shaped DOM', () => {
    document.body.innerHTML = feedHtml();
    expect(isLikelyListingFeed(
      document,
      'https://techcrunch.com/2026/07/23/how-ai-guardrails-are-impeding-researchers/',
    )).toBe(false);
  });
});
