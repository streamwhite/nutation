import { describe, expect, it } from 'vitest';
import {
  formatMultiTabStartLabel,
  formatRestoreButtonLabel,
  formatSelectedTabsStatus,
  formatTranslateButtonLabel,
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

describe('formatSelectedTabsStatus', () => {
  it('mentions tab count when translating several tabs', () => {
    expect(formatSelectedTabsStatus(3, true)).toBe('Translating 3 tabs…');
    expect(formatSelectedTabsStatus(1, true)).toBe('Translating…');
    expect(formatSelectedTabsStatus(2, false)).toBe('Idle');
  });
});

describe('button labels', () => {
  it('scales labels with selected tab count', () => {
    expect(formatTranslateButtonLabel(1)).toBe('Translate page');
    expect(formatTranslateButtonLabel(4)).toBe('Translate 4 tabs');
    expect(formatRestoreButtonLabel(1)).toBe('Restore original');
    expect(formatRestoreButtonLabel(4)).toBe('Restore 4 tabs');
    expect(formatMultiTabStartLabel(1)).toBe('Starting…');
    expect(formatMultiTabStartLabel(3)).toBe('Starting 3 tabs…');
  });
});
