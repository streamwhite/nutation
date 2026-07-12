import { SKIP_TAG_NAMES } from '@/shared/constants';
import { isChromeElement } from '@/features/dom/content-root';
import { isNonReadableChrome } from '@/features/dom/skip-zones';
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

export function shouldSkipElement(element: Element | null): boolean {
  if (!element) {
    return true;
  }

  let current: Element | null = element;
  while (current) {
    if (SKIP_TAG_NAMES.has(current.tagName)) {
      return true;
    }
    if (isEditableElement(current)) {
      return true;
    }
    current = current.parentElement;
  }

  if (isChromeElement(element) || isNonReadableChrome(element)) {
    return true;
  }

  if (isVisuallyHidden(element)) {
    return true;
  }

  return false;
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

function collectAllTextNodes(root: ParentNode): CollectedTextNode[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as Text;
      if (!isMeaningfulText(textNode.textContent)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (shouldSkipElement(textNode.parentElement)) {
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
): CollectedTextNode[] {
  const collected: CollectedTextNode[] = [];

  function walk(element: Element): void {
    if (shouldSkipElement(element)) {
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
        if (!parent || shouldSkipElement(parent) || !isNearViewport(parent, marginPx)) {
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
    return collectAllTextNodes(root);
  }

  return collectViewportTextNodes(root, marginPx, options?.onDeferSubtree);
}
