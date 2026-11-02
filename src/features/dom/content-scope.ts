import {
  HEADING_TAG_NAMES,
  HEADLINE_CLASS_TOKENS,
  LISTING_DESCRIPTION_CLASS_TOKENS,
  LISTING_DESCRIPTION_ITEMPROPS,
} from '@/shared/constants';
import {
  findArticleContentRoot,
  findMainContentRoot,
  isArticleHeadlineHeading,
  isChromeElement,
  isFeedHeadlineHeading,
} from '@/features/dom/content-root';
import { isActionLabelElement, isBoilerplateElement } from '@/features/dom/skip-zones';

export type ContentScopeFilter = ((element: Element | null) => boolean) & {
  /** Extends a listing scope with feed items appended after the first scan. */
  addRoots?: (roots: Element[]) => void;
};

const MAX_ITEM_SIBLINGS = 8;
const MIN_TITLE_LINK_LENGTH = 12;
const MAX_TITLE_LINK_LENGTH = 200;
const MIN_TITLE_LINKS = 2;
const ARTICLE_HEADER_CLASS_TOKENS = [
  'article',
  'headline',
  'hero',
  'post',
  'story',
  'entry',
  'title',
] as const;
const SIDEBAR_CLASS_TOKENS = [
  'sidebar',
  'side-bar',
  'widget-area',
  'secondary-column',
] as const;

function classTokens(element: Element): string[] {
  const tokens: string[] = [];
  if (element.id) {
    tokens.push(element.id.toLowerCase());
  }
  for (const token of element.classList) {
    tokens.push(token.toLowerCase());
  }
  return tokens;
}

function matchesToken(tokens: string[], needles: readonly string[]): boolean {
  return tokens.some((token) => needles.some((needle) => (
    token === needle
    || token.startsWith(`${needle}-`)
    || token.endsWith(`-${needle}`)
    || token.includes(`-${needle}-`)
  )));
}

function normalizedText(element: Element): string {
  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function isInsideSidebar(element: Element): boolean {
  let current: Element | null = element;
  while (current && current !== document.body && current !== document.documentElement) {
    const role = current.getAttribute('role')?.toLowerCase();
    if (current.tagName === 'ASIDE' || role === 'complementary') {
      return true;
    }
    if (current.tagName === 'MAIN' || current.tagName === 'ARTICLE' || role === 'main') {
      return false;
    }
    if (matchesToken(classTokens(current), SIDEBAR_CLASS_TOKENS)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function isDescriptionElement(element: Element): boolean {
  if (element.tagName === 'P') {
    return true;
  }
  const itemprop = element.getAttribute('itemprop')?.toLowerCase() ?? '';
  if (LISTING_DESCRIPTION_ITEMPROPS.has(itemprop)) {
    return true;
  }
  return matchesToken(classTokens(element), LISTING_DESCRIPTION_CLASS_TOKENS);
}

function isSiteChrome(heading: Element): boolean {
  const headlineClass = classTokens(heading).some((token) => (
    HEADLINE_CLASS_TOKENS.some((needle) => token.includes(needle))
  ));

  let current: Element | null = heading.parentElement;
  while (current && current !== document.documentElement) {
    if (current.tagName === 'FOOTER' || current.tagName === 'NAV' || current.tagName === 'ASIDE') {
      return true;
    }
    if (current.tagName === 'HEADER') {
      const role = current.getAttribute('role')?.toLowerCase();
      if (role === 'banner' || current.querySelector('nav')) {
        return true;
      }
      const articleHeader = matchesToken(classTokens(current), ARTICLE_HEADER_CLASS_TOKENS);
      if (!articleHeader && !headlineClass) {
        return true;
      }
    }
    current = current.parentElement;
  }
  return false;
}

function isInsideArticleHeadline(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (HEADING_TAG_NAMES.has(current.tagName)
      && isArticleHeadlineHeading(current)
      && !isBoilerplateElement(current)
      && !isInsideSidebar(current)
      && !isSiteChrome(current)) {
      return true;
    }
    if (current === element.ownerDocument.body) {
      break;
    }
    current = current.parentElement;
  }
  return false;
}

/**
 * Article pages: translate only the story body plus a visible headline that
 * lives outside it (for example a hero title above <main>).
 */
function createArticleScopeFilter(doc: Document): ContentScopeFilter {
  const root = findArticleContentRoot(doc);

  return (element) => {
    if (!element) {
      return false;
    }
    if (root.contains(element)) {
      return !isBoilerplateElement(element);
    }
    return isInsideArticleHeadline(element);
  };
}

function isTitleLikeLink(anchor: Element, root: Element): boolean {
  if (anchor.tagName !== 'A' || !root.contains(anchor)) {
    return false;
  }
  if (anchor.closest('h1, h2, h3, h4, h5, h6')
    || anchor.querySelector('h1, h2, h3, h4, h5, h6')
    || anchor.closest('p')) {
    return false;
  }
  if (isInsideSidebar(anchor)) {
    return false;
  }
  const href = anchor.getAttribute('href')?.trim() ?? '';
  if (!href || href.startsWith('#') || href.toLowerCase().startsWith('javascript:')) {
    return false;
  }
  const text = normalizedText(anchor);
  if (text.length < MIN_TITLE_LINK_LENGTH || text.length > MAX_TITLE_LINK_LENGTH) {
    return false;
  }
  return !isChromeElement(anchor) && !isBoilerplateElement(anchor);
}

function containsOtherTitle(
  element: Element,
  title: Element,
  root: Element,
): boolean {
  for (const candidate of element.querySelectorAll('h1, h2, h3, a')) {
    if (candidate === title) {
      continue;
    }
    if (isFeedHeadlineHeading(candidate)
      || isTitleLikeLink(candidate, root)
      || candidate.querySelector('h1, h2, h3')) {
      return true;
    }
  }
  return false;
}

/**
 * Grow from a title to the largest wrapper that still belongs to this single
 * feed item. For card layouts that is the card; for flat feeds it is the link
 * that holds the headline.
 */
function findItemRoot(title: Element, root: Element): Element {
  let current = title;
  while (current.parentElement && current.parentElement !== root) {
    const parent = current.parentElement;
    if (parent === document.body || parent === document.documentElement) {
      break;
    }
    if (containsOtherTitle(parent, title, root)) {
      break;
    }
    current = parent;
  }
  return current;
}

function addIfReadable(element: Element, allowed: Set<Element>): void {
  if (isBoilerplateElement(element) || isInsideSidebar(element)) {
    return;
  }
  allowed.add(element);
}

function isListingDetailElement(element: Element): boolean {
  return isDescriptionElement(element) || isActionLabelElement(element);
}

function addListingDetails(container: Element, allowed: Set<Element>): void {
  if (isListingDetailElement(container)) {
    addIfReadable(container, allowed);
  }
  for (const element of container.querySelectorAll('p, a, button, [itemprop], [class]')) {
    if (isListingDetailElement(element)) {
      addIfReadable(element, allowed);
    }
  }
}

function containsFeedTitle(element: Element, root: Element): boolean {
  for (const candidate of element.querySelectorAll('h1, h2, h3, a')) {
    if (isFeedHeadlineHeading(candidate) || isTitleLikeLink(candidate, root)) {
      return true;
    }
  }
  return false;
}

function addListingItem(title: Element, root: Element, allowed: Set<Element>): void {
  addIfReadable(title, allowed);

  const itemRoot = findItemRoot(title, root);
  addListingDetails(itemRoot, allowed);

  let sibling = itemRoot.nextElementSibling;
  for (let index = 0; sibling && index < MAX_ITEM_SIBLINGS; index += 1) {
    if (containsFeedTitle(sibling, root)) {
      break;
    }
    addListingDetails(sibling, allowed);
    sibling = sibling.nextElementSibling;
  }
}

function elementsIncludingSelf(container: Element, selector: string): Element[] {
  const matches = Array.from(container.querySelectorAll(selector));
  if (container.matches(selector)) {
    matches.unshift(container);
  }
  return matches;
}

function collectListingItems(
  container: Element,
  root: Element,
  allowed: Set<Element>,
  requireMultipleLinks: boolean,
): void {
  const headings = elementsIncludingSelf(container, 'h1, h2, h3')
    .filter((heading) => isFeedHeadlineHeading(heading)
      && !isBoilerplateElement(heading)
      && !isInsideSidebar(heading));

  if (headings.length > 0) {
    for (const heading of headings) {
      addListingItem(heading, root, allowed);
    }
    return;
  }

  const titleLinks = elementsIncludingSelf(container, 'a')
    .filter((anchor) => isTitleLikeLink(anchor, root));
  if (titleLinks.length === 0) {
    return;
  }
  // Page-level scans need a few links to recognise a link-only feed; a newly
  // appended item only carries its own link.
  if (requireMultipleLinks && titleLinks.length < MIN_TITLE_LINKS) {
    return;
  }
  for (const link of titleLinks) {
    addListingItem(link, root, allowed);
  }
}

/**
 * Listing pages: translate feed titles and descriptions only. When a feed has
 * no recognizable titles (rare), fall back to normal page scope so the page is
 * not left untranslated.
 *
 * Feeds grow as the user scrolls, so the allowed set is extended with newly
 * appended items instead of rescanning the whole feed on every append.
 */
function createListingScopeFilter(doc: Document): ContentScopeFilter {
  const root = findMainContentRoot(doc);
  const allowed = new Set<Element>();
  collectListingItems(root, root, allowed, true);

  if (allowed.size === 0) {
    return (element) => Boolean(element) && !isBoilerplateElement(element);
  }

  const filter: ContentScopeFilter = (element) => {
    if (!element || isBoilerplateElement(element)) {
      return false;
    }
    let current: Element | null = element;
    while (current) {
      if (allowed.has(current)) {
        return true;
      }
      if (current === root) {
        break;
      }
      current = current.parentElement;
    }
    return false;
  };

  filter.addRoots = (roots) => {
    for (const added of roots) {
      if (added.isConnected) {
        collectListingItems(added, root, allowed, false);
      }
    }
  };

  return filter;
}

export function createContentScopeFilter(
  doc: Document,
  isListingFeed: boolean,
): ContentScopeFilter {
  return isListingFeed
    ? createListingScopeFilter(doc)
    : createArticleScopeFilter(doc);
}
