import { hasArticleMetadata } from '@/features/dom/article-metadata';
import { isLikelyArticleUrl, isLikelyListingUrl } from '@/features/dom/article-url';
import { findMainContentRoot, isListingFeedRoot } from '@/features/dom/content-root';

/**
 * Layered article/listing classifier, highest-confidence signal first:
 * structured metadata -> URL listing signals -> URL article signals -> DOM shape.
 */
export function isLikelyListingFeed(
  doc: Document = document,
  url: string = doc.location?.href ?? '',
): boolean {
  if (hasArticleMetadata(doc)) {
    return false;
  }
  if (isLikelyListingUrl(url)) {
    return true;
  }
  if (isLikelyArticleUrl(url)) {
    return false;
  }
  return isListingFeedRoot(findMainContentRoot(doc));
}
