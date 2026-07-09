import {
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

function matchesToken(tokens: string[], needles: readonly string[]): boolean {
  return tokens.some((token) => needles.some((needle) => token.includes(needle)));
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

export function isNonReadableChrome(element: Element | null): boolean {
  return isMetadataElement(element) || isShareElement(element);
}
