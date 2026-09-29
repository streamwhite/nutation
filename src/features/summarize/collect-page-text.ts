import { collectTextNodes } from '@/features/dom/collect-text';
import { isLikelyArticleUrl } from '@/features/dom/article-url';
import { findCollectionRoot, isListingFeedRoot } from '@/features/dom/content-root';
import { shouldTranslateText } from '@/features/translate/batch';
import {
  MIN_TRANSLATE_TEXT_LENGTH,
  SUMMARIZE_MAX_CHARS_DEFAULT,
} from '@/shared/constants';

export type PageTextForSummary = {
  text: string;
  charCount: number;
  isListingFeed: boolean;
};

export function resolveSummarizeMaxChars(
  envValue: string | undefined,
  fallback = SUMMARIZE_MAX_CHARS_DEFAULT,
): number {
  const parsed = Number.parseInt(envValue ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function trimPageTextForSummary(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars);
}

function joinCollectedLines(lines: string[]): string {
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function collectPageTextForSummary(
  doc: Document = document,
  maxChars = resolveSummarizeMaxChars(import.meta.env.VITE_SUMMARIZE_MAX_CHARS),
  pageUrl: string = doc.location?.href ?? '',
): PageTextForSummary {
  const root = findCollectionRoot(doc);
  const collected = collectTextNodes(root);
  const lines: string[] = [];

  for (const item of collected) {
    const trimmed = item.text.replace(/\s+/g, ' ').trim();
    if (!shouldTranslateText(trimmed, MIN_TRANSLATE_TEXT_LENGTH)) {
      continue;
    }
    lines.push(trimmed);
  }

  const text = trimPageTextForSummary(joinCollectedLines(lines), maxChars);
  return {
    text,
    charCount: text.length,
    isListingFeed: !isLikelyArticleUrl(pageUrl) && isListingFeedRoot(root),
  };
}
