import { SKIP_TAG_NAMES } from '@/shared/constants';
import { isChromeNode } from '@/features/dom/content-root';
import { isActionLabelElement, isNonReadableChromeNode } from '@/features/dom/skip-zones';
import { isVisuallyHidden } from '@/features/dom/visibility';
import {
  isAboveViewport,
  isBelowViewport,
  isNearViewport,
} from '@/features/dom/viewport';
import { needsChildViewportProbe } from '@/features/dom/visual-layout';

function isEditableElement(element: Element): boolean {
  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }
  const attr = element.getAttribute('contenteditable');
  return attr !== null && attr.toLowerCase() !== 'false';
}

type SkipCache = WeakMap<Element, boolean>;

/**
 * Skip rules other than visibility are inherited from ancestors, so walking up
 * the tree once per element and memoizing the result is equivalent to
 * re-walking the chain for every check. Collections call this for every element
 * and text parent, which made plain scrolling noticeably expensive on long
 * feeds. Visibility stays a per-element check: `checkVisibility` already
 * accounts for ancestors, and a descendant may override an ancestor's
 * `visibility: hidden`.
 */
function isInheritedSkip(element: Element | null, cache: SkipCache): boolean {
  if (!element) {
    return false;
  }
  // The document root is never itself a reason to skip, and the ancestor
  // checks below stop before it.
  if (element === document.documentElement) {
    return false;
  }

  const cached = cache.get(element);
  if (cached !== undefined) {
    return cached;
  }

  let skip = false;
  if (SKIP_TAG_NAMES.has(element.tagName)) {
    skip = !(element.tagName === 'BUTTON' && isActionLabelElement(element));
  }
  if (!skip) {
    skip = isEditableElement(element);
  }
  if (!skip) {
    skip = isChromeNode(element);
  }
  if (!skip) {
    skip = isNonReadableChromeNode(element);
  }
  if (!skip) {
    skip = isInheritedSkip(element.parentElement, cache);
  }

  cache.set(element, skip);
  return skip;
}

function isSkipped(element: Element | null, cache: SkipCache): boolean {
  if (!element) {
    return false;
  }
  return isInheritedSkip(element, cache) || isVisuallyHidden(element);
}

export function shouldSkipElement(element: Element | null): boolean {
  if (!element) {
    return true;
  }
  return isSkipped(element, new WeakMap());
}

export function isMeaningfulText(text: string | null | undefined): boolean {
  return Boolean(text && text.trim().length > 0);
}

export type CollectedTextNode = {
  node: Text;
  text: string;
};

export type CollectTextNodesOptions = {
  viewportMarginPx?: number;
  onDeferSubtree?: (element: Element) => void;
  isInScope?: (element: Element | null) => boolean;
};

function walkShadowRoots(element: Element, walk: (child: Element) => void): void {
  const shadow = element.shadowRoot;
  if (!shadow) {
    return;
  }

  for (const child of shadow.children) {
    if (child instanceof Element) {
      walk(child);
    }
  }
}

function walkChildren(element: Element, walk: (child: Element) => void): void {
  for (const child of element.children) {
    walk(child);
  }
  walkShadowRoots(element, walk);
}

function collectAllTextNodes(
  root: ParentNode,
  isInScope?: (element: Element | null) => boolean,
): CollectedTextNode[] {
  const skipCache: SkipCache = new WeakMap();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as Text;
      if (!isMeaningfulText(textNode.textContent)) {
        return NodeFilter.FILTER_REJECT;
      }
      const parent = textNode.parentElement;
      if (isSkipped(parent, skipCache) || (isInScope && !isInScope(parent))) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const collected: CollectedTextNode[] = [];
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    collected.push({
      node: textNode,
      text: textNode.textContent ?? '',
    });
    current = walker.nextNode();
  }
  return collected;
}

function collectViewportTextNodes(
  root: Element,
  marginPx: number,
  onDeferSubtree?: (element: Element) => void,
  isInScope?: (element: Element | null) => boolean,
): CollectedTextNode[] {
  const collected: CollectedTextNode[] = [];
  const skipCache: SkipCache = new WeakMap();

  function walk(element: Element): void {
    if (isSkipped(element, skipCache)) {
      return;
    }

    if (isBelowViewport(element, marginPx)) {
      if (needsChildViewportProbe(element)) {
        walkChildren(element, walk);
        return;
      }
      onDeferSubtree?.(element);
      return;
    }

    if (isAboveViewport(element, marginPx)) {
      if (needsChildViewportProbe(element)) {
        walkChildren(element, walk);
      }
      return;
    }

    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const textNode = child as Text;
        if (!isMeaningfulText(textNode.textContent)) {
          continue;
        }
        const parent = textNode.parentElement;
        if (!parent
          || isSkipped(parent, skipCache)
          || !isNearViewport(parent, marginPx)
          || (isInScope && !isInScope(parent))) {
          continue;
        }
        collected.push({
          node: textNode,
          text: textNode.textContent ?? '',
        });
        continue;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child as Element);
      }
    }

    walkShadowRoots(element, walk);
  }

  walk(root);
  return collected;
}

export function collectTextNodes(
  root: ParentNode,
  options?: CollectTextNodesOptions,
): CollectedTextNode[] {
  const marginPx = options?.viewportMarginPx;
  if (marginPx === undefined || !(root instanceof Element)) {
    return collectAllTextNodes(root, options?.isInScope);
  }

  return collectViewportTextNodes(
    root,
    marginPx,
    options?.onDeferSubtree,
    options?.isInScope,
  );
}
