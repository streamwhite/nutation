import { describe, expect, it } from 'vitest';
import {
  ensureDocumentTitleTextNode,
  readDocumentTitle,
  restoreDocumentTitle,
} from '@/features/translate/tab-title';

describe('ensureDocumentTitleTextNode', () => {
  it('returns a connected text node for the title element', () => {
    document.head.innerHTML = '<title>Hello world</title>';
    const node = ensureDocumentTitleTextNode(document);
    expect(node).not.toBeNull();
    expect(node?.textContent).toBe('Hello world');
    expect(node?.isConnected).toBe(true);
    expect(document.title).toBe('Hello world');
  });

  it('normalizes mixed title children into one text node', () => {
    document.head.innerHTML = '<title></title>';
    const titleEl = document.querySelector('title')!;
    titleEl.append('Hello', document.createElement('span'), ' world');
    const node = ensureDocumentTitleTextNode(document);
    expect(node?.textContent).toBe('Hello world');
    expect(titleEl.childNodes.length).toBe(1);
  });
});

describe('restoreDocumentTitle', () => {
  it('writes the original title back', () => {
    document.title = 'Translated';
    restoreDocumentTitle('Original', document);
    expect(document.title).toBe('Original');
    expect(readDocumentTitle(document)).toBe('Original');
  });
});
