import { INTERSECTION_ROOT_MARGIN, MUTATION_DEBOUNCE_MS } from '@/shared/constants';

export function createDebouncedCallback(
  callback: () => void,
  delayMs: number = MUTATION_DEBOUNCE_MS,
): (() => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, delayMs);
  };

  run.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return run;
}

/**
 * Rate-limits frequent events (scroll, resize) while still running the
 * callback during a sustained burst. A trailing debounce would postpone the
 * work until the user stops scrolling, which leaves newly loaded content
 * untranslated for as long as the scroll keeps going.
 */
export function createThrottledCallback(
  callback: () => void,
  intervalMs: number,
): (() => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRunAt = 0;

  const run = () => {
    if (timer) {
      return;
    }
    const delayMs = Math.max(0, intervalMs - (Date.now() - lastRunAt));
    timer = setTimeout(() => {
      timer = null;
      lastRunAt = Date.now();
      callback();
    }, delayMs);
  };

  run.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return run;
}

/**
 * Elements added by mutations that can carry new feed items. Only headings and
 * links introduce new scope content, so attribute and text edits (including
 * translations we write) never force a feed rescan.
 */
export function collectFeedContentRoots(records: MutationRecord[]): Element[] {
  const roots: Element[] = [];
  for (const record of records) {
    if (record.type !== 'childList') {
      continue;
    }
    for (const node of record.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      const element = node as Element;
      if (element.matches('h1, h2, h3, a')
        || element.querySelector('h1, h2, h3, a')) {
        roots.push(element);
      }
    }
  }
  return roots;
}

export function observeMutations(
  root: Node,
  onChange: (records: MutationRecord[]) => void,
): MutationObserver {
  // Callers already coalesce DOM work (PageTranslator routes this through its
  // own debounced scheduler), so an extra debounce here only delays newly
  // inserted content before it can start translating.
  const observer = new MutationObserver((records) => {
    onChange(records);
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
  });

  return observer;
}

export function observeVisibleElements(
  elements: Element[],
  onVisible: (element: Element) => void,
): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onVisible(entry.target);
          observer.unobserve(entry.target);
        }
      }
    },
    { root: null, rootMargin: INTERSECTION_ROOT_MARGIN, threshold: 0 },
  );

  for (const element of elements) {
    observer.observe(element);
  }

  return observer;
}
