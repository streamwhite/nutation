export function isVisuallyHidden(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.closest('[hidden], [aria-hidden="true"], [inert]')) {
    return true;
  }

  if (typeof element.checkVisibility === 'function') {
    try {
      return !element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
    } catch {
      // Fall through to computed-style checks.
    }
  }

  let current: HTMLElement | null = element;
  while (current) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return true;
    }
    if (Number.parseFloat(style.opacity) === 0) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}
