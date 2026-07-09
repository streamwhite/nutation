import {
  CHROME_ROLE_NAMES,
  CHROME_TAG_NAMES,
  MAIN_CONTENT_SELECTORS,
  VISUALIZATION_EMBED_SELECTORS,
} from '@/shared/constants';

export function isChromeElement(element: Element | null): boolean {
  if (!element) {
    return true;
  }

  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    if (CHROME_TAG_NAMES.has(current.tagName)) {
      return true;
    }
    const role = current.getAttribute('role')?.toLowerCase();
    if (role && CHROME_ROLE_NAMES.has(role)) {
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

function pickLargestArticle(root: ParentNode): Element | null {
  const articles = Array.from(root.querySelectorAll('article'));
  if (articles.length === 0) {
    return null;
  }

  let best: Element | null = null;
  let bestScore = 0;
  for (const article of articles) {
    if (isChromeElement(article.parentElement)) {
      continue;
    }
    const score = scoreTextLength(article);
    if (score > bestScore) {
      best = article;
      bestScore = score;
    }
  }
  return best;
}

function pickLargestContentBlock(root: ParentNode): Element | null {
  const candidates = Array.from(
    root.querySelectorAll('div, section, article, main'),
  );
  let best: Element | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    if (isChromeElement(candidate)) {
      continue;
    }
    const score = scoreTextLength(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return bestScore >= 80 ? best : null;
}

export function findMainContentRoot(
  doc: Document = document,
): Element {
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const match = doc.querySelector(selector);
    if (match && !isChromeElement(match.parentElement) && scoreTextLength(match) > 0) {
      return match;
    }
  }

  const largestArticle = pickLargestArticle(doc.body ?? doc);
  if (largestArticle) {
    return largestArticle;
  }

  const largestBlock = pickLargestContentBlock(doc.body ?? doc);
  if (largestBlock) {
    return largestBlock;
  }

  return doc.body ?? doc.documentElement;
}

function findVisualizationEmbed(doc: Document): Element | null {
  for (const selector of VISUALIZATION_EMBED_SELECTORS) {
    const match = doc.querySelector(selector);
    if (match instanceof Element && !isChromeElement(match)) {
      return match;
    }
  }
  return null;
}

export function findCollectionRoot(doc: Document = document): Element {
  const preferred = findMainContentRoot(doc);
  const body = doc.body ?? doc.documentElement;
  const embed = findVisualizationEmbed(doc);

  if (embed && !preferred.contains(embed)) {
    return body;
  }

  return preferred;
}
