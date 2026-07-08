import { SKIP_TAG_NAMES } from '@/shared/constants';

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

  return false;
}

export function isMeaningfulText(text: string | null | undefined): boolean {
  return Boolean(text && text.trim().length > 0);
}

export type CollectedTextNode = {
  node: Text;
  text: string;
};

export function collectTextNodes(root: ParentNode): CollectedTextNode[] {
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
