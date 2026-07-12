import { describe, expect, it } from 'vitest';
import { isVisuallyHidden } from '@/features/dom/visibility';

describe('isVisuallyHidden', () => {
  it('detects display none and aria-hidden ancestors', () => {
    document.body.innerHTML = `
      <div id="hidden" style="display: none;">
        <p id="child">Hidden copy</p>
      </div>
      <div aria-hidden="true" id="aria-hidden">
        <p id="aria-child">Also hidden</p>
      </div>
      <p id="visible">Visible copy</p>
    `;

    expect(isVisuallyHidden(document.getElementById('child')!)).toBe(true);
    expect(isVisuallyHidden(document.getElementById('aria-child')!)).toBe(true);
    expect(isVisuallyHidden(document.getElementById('visible')!)).toBe(false);
  });
});
