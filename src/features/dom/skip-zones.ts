import {
  ACTION_CLASS_TOKENS,
  ACTION_TEXT_PATTERN,
  BOILERPLATE_CLASS_TOKENS,
  BOILERPLATE_LABEL_PATTERN,
  METADATA_CLASS_TOKENS,
  METADATA_ROLE_NAMES,
  METADATA_TAG_NAMES,
  SHARE_CLASS_TOKENS,
  SHARE_LABEL_PATTERN,
} from '@/shared/constants';

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

function isWordpressTaxonomyToken(token: string): boolean {
  if (token.startsWith('tag-')) {
    return true;
  }
  return token.startsWith('category-') && token !== 'category-list';
}

function matchesToken(tokens: string[], needles: readonly string[]): boolean {
  return tokens.some((token) => {
    if (isWordpressTaxonomyToken(token)) {
      return false;
    }
    return needles.some((needle) => {
      if (token === needle) {
        return true;
      }
      return token.startsWith(`${needle}-`)
        || token.endsWith(`-${needle}`)
        || token.includes(`-${needle}-`);
    });
  });
}

function hasAncestorMatch(
  element: Element | null,
  matcher: (node: Element) => boolean,
): boolean {
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    if (matcher(current)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function isMetadataNode(element: Element): boolean {
  if (METADATA_TAG_NAMES.has(element.tagName)) {
    return true;
  }
  if (element.hasAttribute('datetime')) {
    return true;
  }
  if (element.getAttribute('rel')?.toLowerCase() === 'author') {
    return true;
  }
  const role = element.getAttribute('role')?.toLowerCase();
  if (role && METADATA_ROLE_NAMES.has(role)) {
    return true;
  }
  if (matchesToken(classTokens(element), METADATA_CLASS_TOKENS)) {
    return true;
  }
  return false;
}

function isShareNode(element: Element): boolean {
  if (matchesToken(classTokens(element), SHARE_CLASS_TOKENS)) {
    return true;
  }
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() ?? '';
  if (SHARE_LABEL_PATTERN.test(ariaLabel)) {
    return true;
  }
  const title = element.getAttribute('title')?.toLowerCase() ?? '';
  if (SHARE_LABEL_PATTERN.test(title)) {
    return true;
  }
  return false;
}

function isBoilerplateNode(element: Element): boolean {
  if (isActionLabelElement(element)) {
    return false;
  }
  // Layout wrappers can carry tokens like `has-sidebar` or `popular-posts`
  // without being boilerplate. Never discard a page-level content landmark.
  const role = element.getAttribute('role')?.toLowerCase();
  if (element.tagName === 'MAIN'
    || element.tagName === 'ARTICLE'
    || element.tagName === 'BODY'
    || role === 'main') {
    return false;
  }
  if (matchesToken(classTokens(element), BOILERPLATE_CLASS_TOKENS)) {
    return true;
  }
  const label = element.getAttribute('aria-label')
    ?? element.getAttribute('data-testid')
    ?? '';
  return BOILERPLATE_LABEL_PATTERN.test(label);
}

export function isMetadataElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  return hasAncestorMatch(element, isMetadataNode);
}

export function isShareElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  return hasAncestorMatch(element, isShareNode);
}

export function isBoilerplateElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  return hasAncestorMatch(element, isBoilerplateNode);
}

export function isActionLabelElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  if (matchesToken(classTokens(element), ACTION_CLASS_TOKENS)) {
    return true;
  }
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return text.length > 0 && text.length <= 80 && ACTION_TEXT_PATTERN.test(text);
}

export function isNonReadableChromeNode(element: Element): boolean {
  return isMetadataNode(element)
    || isShareNode(element)
    || isBoilerplateNode(element);
}

export function isNonReadableChrome(element: Element | null): boolean {
  return isMetadataElement(element)
    || isShareElement(element)
    || isBoilerplateElement(element);
}
