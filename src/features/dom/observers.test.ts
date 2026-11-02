import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createThrottledCallback,
  collectFeedContentRoots,
  observeMutations,
} from '@/features/dom/observers';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 10);
  });
}

afterEach(() => {
  vi.useRealTimers();
});

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

describe('collectFeedContentRoots', () => {
  it('ignores text-only edits such as applied translations', () => {
    const record = {
      type: 'characterData',
      addedNodes: [] as unknown as NodeList,
    } as unknown as MutationRecord;

    expect(collectFeedContentRoots([record])).toEqual([]);
  });

  it('ignores attribute changes and plain containers', () => {
    const attribute = {
      type: 'attributes',
      addedNodes: [] as unknown as NodeList,
    } as unknown as MutationRecord;
    const plain = document.createElement('div');
    const plainRecord = {
      type: 'childList',
      addedNodes: [plain] as unknown as NodeList,
    } as unknown as MutationRecord;

    expect(collectFeedContentRoots([attribute])).toEqual([]);
    expect(collectFeedContentRoots([plainRecord])).toEqual([]);
  });

  it('returns added feed items with headings or links', () => {
    const headingItem = document.createElement('article');
    headingItem.appendChild(document.createElement('h2'));
    const linkItem = document.createElement('a');
    linkItem.href = '/story';

    const record = {
      type: 'childList',
      addedNodes: [headingItem, linkItem] as unknown as NodeList,
    } as unknown as MutationRecord;

    expect(collectFeedContentRoots([record])).toEqual([headingItem, linkItem]);
  });
});

describe('createThrottledCallback', () => {
  it('keeps running during sustained scroll events', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const schedule = createThrottledCallback(callback, 150);

    for (let elapsed = 0; elapsed < 1200; elapsed += 16) {
      schedule();
      vi.advanceTimersByTime(16);
    }

    // A trailing debounce would never fire while scroll events keep arriving.
    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it('coalesces a burst into one run and waits for the interval', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const schedule = createThrottledCallback(callback, 150);

    schedule();
    schedule();
    schedule();
    vi.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledTimes(1);

    schedule();
    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(150);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending run', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const schedule = createThrottledCallback(callback, 150);

    schedule();
    schedule.cancel();
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });
});
