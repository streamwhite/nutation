const OUT_OF_FLOW_POSITIONS = new Set(['absolute', 'fixed', 'sticky']);
const CLIPPED_OVERFLOW = new Set(['hidden', 'auto', 'scroll', 'clip']);

export function isOutOfFlowPosition(position: string): boolean {
  return OUT_OF_FLOW_POSITIONS.has(position.toLowerCase());
}

export function hasActiveTransform(transform: string): boolean {
  const value = transform.trim().toLowerCase();
  return value !== '' && value !== 'none';
}

export function isOverflowClipped(overflow: string): boolean {
  return CLIPPED_OVERFLOW.has(overflow.toLowerCase());
}

function elementHasVisualRepositioning(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  if (hasActiveTransform(style.transform)) {
    return true;
  }
  return isOverflowClipped(style.overflow)
    || isOverflowClipped(style.overflowX)
    || isOverflowClipped(style.overflowY);
}

const REPOSITION_PROBE_MAX_DEPTH = 8;

function childHasVisualRepositioning(child: HTMLElement): boolean {
  const style = getComputedStyle(child);
  return isOutOfFlowPosition(style.position) || hasActiveTransform(style.transform);
}

function hasRepositionedDescendant(element: Element, maxDepth = REPOSITION_PROBE_MAX_DEPTH): boolean {
  const queue: Array<{ node: Element; depth: number }> = [];

  for (const child of element.children) {
    queue.push({ node: child, depth: 1 });
  }

  const shadow = element.shadowRoot;
  if (shadow) {
    for (const child of shadow.children) {
      if (child instanceof Element) {
        queue.push({ node: child, depth: 1 });
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current.node instanceof HTMLElement && childHasVisualRepositioning(current.node)) {
      return true;
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    for (const child of current.node.children) {
      queue.push({ node: child, depth: current.depth + 1 });
    }

    const childShadow = current.node.shadowRoot;
    if (childShadow) {
      for (const child of childShadow.children) {
        if (child instanceof Element) {
          queue.push({ node: child, depth: current.depth + 1 });
        }
      }
    }
  }

  return false;
}

export function needsChildViewportProbe(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (elementHasVisualRepositioning(element)) {
    return true;
  }

  for (const child of element.children) {
    if (child instanceof HTMLElement && childHasVisualRepositioning(child)) {
      return true;
    }
  }

  return hasRepositionedDescendant(element);
}
