import { describe, expect, it, vi } from 'vitest';
import { observeMutations } from '@/features/dom/observers';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 10);
  });
}

describe('observeMutations', () => {
  it('notifies without waiting for an extra debounce delay', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onChange = vi.fn();

    const observer = observeMutations(root, onChange);
    root.appendChild(document.createElement('span'));
    await flushMicrotasks();

    // The caller debounces itself, so the observer must not add its own delay
    // before new content can start translating.
    expect(onChange).toHaveBeenCalledTimes(1);

    observer.disconnect();
    root.remove();
  });
});
