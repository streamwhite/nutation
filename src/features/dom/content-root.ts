import {
  CHROME_ROLE_NAMES,
  CHROME_TAG_NAMES,
  HEADING_TAG_NAMES,
  HEADLINE_CLASS_TOKENS,
  MAIN_CONTENT_SELECTORS,
  MIN_HEADLINE_FEED_COUNT,
  MIN_LINKED_HEADLINE_RATIO,
  MIN_TRANSLATE_TEXT_LENGTH,
} from '@/shared/constants';

const NAV_ROLES = new Set(['navigation', 'menubar', 'toolbar']);
const MAIN_ROOT_SELECTORS = MAIN_CONTENT_SELECTORS.filter((selector) => (
  selector === 'main' || selector === '[role="main"]'
));

function matchesMainContentSelector(element: Element): boolean {
  return MAIN_CONTENT_SELECTORS.some((selector) => {
    try {
      return element.matches(selector);
    } catch {
      return false;
    }
  });
}

function isInsideMainContent(element: Element): boolean {
  let current: Element | null = element.parentElement;
  while (current && current !== document.documentElement) {
    if (matchesMainContentSelector(current)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

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

function matchesHeadlineClass(element: Element): boolean {
  return classTokens(element).some((token) => (
    HEADLINE_CLASS_TOKENS.some((needle) => token.includes(needle))
  ));
}

function hasNavDescendant(element: Element): boolean {
  if (element.tagName === 'NAV' || element.tagName === 'MENU') {
    return true;
  }
  const role = element.getAttribute('role')?.toLowerCase();
  if (role && NAV_ROLES.has(role)) {
    return true;
  }
  return element.querySelector('nav, menu, [role="navigation"], [role="menubar"], [role="toolbar"]') !== null;
}

function isInsideSiteNav(element: Element): boolean {
  let current: Element | null = element.parentElement;
  while (current && current !== document.documentElement) {
    if (current.tagName === 'NAV' || current.tagName === 'MENU') {
      return true;
    }
    const role = current.getAttribute('role')?.toLowerCase();
    if (role && NAV_ROLES.has(role)) {
      return true;
    }
    if (current.tagName === 'HEADER' && hasNavDescendant(current)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function isArticleHeadlineHeading(element: Element): boolean {
  if (!HEADING_TAG_NAMES.has(element.tagName)) {
    return false;
  }
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length < MIN_TRANSLATE_TEXT_LENGTH) {
    return false;
  }
  if (isInsideSiteNav(element)) {
    return false;
  }
  if (matchesHeadlineClass(element)) {
    return true;
  }
  if (isInsideMainContent(element)) {
    return true;
  }
  return element.tagName === 'H1';
}

function containsArticleHeadline(element: Element): boolean {
  if (isArticleHeadlineHeading(element)) {
    return true;
  }
  for (const heading of element.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    if (isArticleHeadlineHeading(heading)) {
      return true;
    }
  }
  return false;
}

function isChromeNode(element: Element): boolean {
  const role = element.getAttribute('role')?.toLowerCase();
  if (role === 'banner' && containsArticleHeadline(element)) {
    return false;
  }
  if (role && CHROME_ROLE_NAMES.has(role)) {
    return true;
  }

  if (!CHROME_TAG_NAMES.has(element.tagName)) {
    return false;
  }

  if (element.tagName === 'NAV' || element.tagName === 'MENU') {
    return true;
  }

  if (element.tagName === 'HEADER' && containsArticleHeadline(element)) {
    return false;
  }

  if (element.tagName === 'HEADER' && isInsideMainContent(element)) {
    return false;
  }

  return true;
}

export function isChromeElement(element: Element | null): boolean {
  if (!element) {
    return true;
  }

  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    if (isChromeNode(current)) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

function scoreTextLength(element: Element): number {
  const text = element.textContent ?? '';
  return text.replace(/\s+/g, ' ').trim().length;
}

function isFeedHeadlineHeading(element: Element): boolean {
  const tag = element.tagName;
  if (tag !== 'H1' && tag !== 'H2') {
    return false;
  }
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (text.length < MIN_TRANSLATE_TEXT_LENGTH) {
    return false;
  }
  if (isInsideSiteNav(element) || isChromeElement(element)) {
    return false;
  }
  return true;
}

function isInsideLink(element: Element): boolean {
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    if (current.tagName === 'A') {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function isListingFeedRoot(root: Element): boolean {
  const headlines = Array.from(root.querySelectorAll('h1, h2'))
    .filter((heading) => isFeedHeadlineHeading(heading));
  if (headlines.length < MIN_HEADLINE_FEED_COUNT) {
    return false;
  }
  const linkedCount = headlines.filter((heading) => isInsideLink(heading)).length;
  return linkedCount / headlines.length >= MIN_LINKED_HEADLINE_RATIO;
}

export function findMainContentRoot(
  doc: Document = document,
): Element {
  const body = doc.body ?? doc.documentElement;

  for (const selector of MAIN_ROOT_SELECTORS) {
    const match = doc.querySelector(selector);
    if (match && scoreTextLength(match) > 0) {
      return match;
    }
  }

  return body;
}

export function findCollectionRoot(doc: Document = document): Element {
  return doc.body ?? doc.documentElement;
}
