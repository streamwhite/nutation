import { describe, expect, it } from 'vitest';
import {
  normalizePopupTabs,
  partitionTranslatableTabs,
  summarizeMultiTabResults,
} from '@/features/popup/selected-tabs';

describe('normalizePopupTabs', () => {
  it('keeps tabs with numeric ids', () => {
    expect(normalizePopupTabs([
      { id: 1, url: 'https://a.example' },
      { url: 'https://missing-id.example' },
      { id: 2 },
    ])).toEqual([
      { id: 1, url: 'https://a.example' },
      { id: 2, url: '' },
    ]);
  });
});

describe('partitionTranslatableTabs', () => {
  it('splits restricted browser pages from website tabs', () => {
    const result = partitionTranslatableTabs([
      { id: 1, url: 'https://news.example' },
      { id: 2, url: 'chrome://extensions/' },
      { id: 3, url: 'https://docs.example' },
    ]);
    expect(result.translatable.map((tab) => tab.id)).toEqual([1, 3]);
    expect(result.restricted.map((tab) => tab.id)).toEqual([2]);
  });
});

describe('summarizeMultiTabResults', () => {
  it('reports started and failed counts', () => {
    const summary = summarizeMultiTabResults([
      { ok: true, tabId: 1 },
      { ok: false, tabId: 2, error: 'Content script unavailable' },
      { ok: true, tabId: 3 },
    ]);
    expect(summary.started).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.firstError).toBe('Content script unavailable');
    expect(summary.firstFailedTabId).toBe(2);
  });
});
