import { describe, expect, it } from 'vitest';
import {
  collectPageTextForSummary,
  resolveSummarizeMaxChars,
  trimPageTextForSummary,
} from '@/features/summarize/collect-page-text';

describe('resolveSummarizeMaxChars', () => {
  it('uses positive env values and falls back otherwise', () => {
    expect(resolveSummarizeMaxChars('12000', 60_000)).toBe(12_000);
    expect(resolveSummarizeMaxChars('0', 60_000)).toBe(60_000);
    expect(resolveSummarizeMaxChars(undefined, 60_000)).toBe(60_000);
  });
});

describe('trimPageTextForSummary', () => {
  it('keeps short text and truncates long text', () => {
    expect(trimPageTextForSummary('hello', 10)).toBe('hello');
    expect(trimPageTextForSummary('abcdefghijklmnop', 8)).toBe('abcdefgh');
  });
});

describe('collectPageTextForSummary', () => {
  it('collects full-page readable text once without viewport filter', () => {
    document.body.innerHTML = `
      <nav>Site menu</nav>
      <main>
        <h1>Article title about AI</h1>
        <p>First paragraph with enough readable content for summary.</p>
        <p>Second paragraph continues the story for the reader.</p>
      </main>
    `;

    const result = collectPageTextForSummary(document);
    expect(result.text).toContain('Article title about AI');
    expect(result.text).toContain('First paragraph');
    expect(result.text).not.toContain('Site menu');
    expect(result.isListingFeed).toBe(false);
    expect(result.charCount).toBeGreaterThan(20);
  });

  it('flags listing or feed style pages', () => {
    document.body.innerHTML = `
      <main>
        <h2>Story one headline here</h2>
        <p>${'Summary one '.repeat(8)}</p>
        <h2>Story two headline here</h2>
        <p>${'Summary two '.repeat(8)}</p>
        <h2>Story three headline here</h2>
        <p>${'Summary three '.repeat(8)}</p>
      </main>
    `;

    const result = collectPageTextForSummary(document);
    expect(result.isListingFeed).toBe(true);
    expect(result.text).toContain('Story one headline here');
  });

  it('treats date-based article urls as articles despite many headlines', () => {
    document.body.innerHTML = `
      <main>
        <h2>Story one headline here</h2>
        <p>${'Summary one '.repeat(8)}</p>
        <h2>Story two headline here</h2>
        <p>${'Summary two '.repeat(8)}</p>
        <h2>Story three headline here</h2>
        <p>${'Summary three '.repeat(8)}</p>
      </main>
    `;

    const result = collectPageTextForSummary(
      document,
      undefined,
      'https://techcrunch.com/2026/07/23/how-ai-guardrails-are-impeding-researchers/',
    );
    expect(result.isListingFeed).toBe(false);
  });
});
