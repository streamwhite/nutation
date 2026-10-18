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

export function observeMutations(
  root: Node,
  onChange: () => void,
): MutationObserver {
  // Callers already coalesce DOM work (PageTranslator routes this through its
  // own debounced scheduler), so an extra debounce here only delays newly
  // inserted content before it can start translating.
  const observer = new MutationObserver(() => {
    onChange();
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
