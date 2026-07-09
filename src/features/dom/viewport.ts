export function isNearViewport(element: Element, marginPx: number): boolean {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || 0;
  const viewportWidth = window.innerWidth || 0;
  return rect.bottom >= -marginPx
    && rect.top <= viewportHeight + marginPx
    && rect.right >= -marginPx
    && rect.left <= viewportWidth + marginPx;
}

export function isBelowViewport(element: Element, marginPx: number): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top > (window.innerHeight || 0) + marginPx;
}

export function isAboveViewport(element: Element, marginPx: number): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom < -marginPx;
}
