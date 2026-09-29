export function readDocumentTitle(doc: Document = document): string {
  return doc.title;
}

export function restoreDocumentTitle(
  original: string,
  doc: Document = document,
): void {
  doc.title = original;
}

export function ensureDocumentTitleTextNode(doc: Document = document): Text | null {
  let titleEl = doc.querySelector('head > title') ?? doc.querySelector('title');
  if (!titleEl) {
    if (!doc.head) {
      return null;
    }
    titleEl = doc.createElement('title');
    doc.head.append(titleEl);
  }

  if (
    titleEl.childNodes.length === 1
    && titleEl.firstChild?.nodeType === Node.TEXT_NODE
  ) {
    return titleEl.firstChild as Text;
  }

  const text = doc.title;
  titleEl.replaceChildren();
  const node = doc.createTextNode(text);
  titleEl.append(node);
  return node;
}
