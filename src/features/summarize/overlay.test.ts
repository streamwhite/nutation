import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatSummaryParagraphs,
  resolveSummaryFontPx,
  showSummaryOverlay,
} from '@/features/summarize/overlay';
import { getUiStrings } from '@/shared/ui-strings';

const storage = new Map<string, unknown>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        set: vi.fn(async (value: Record<string, unknown>) => {
          for (const [key, entry] of Object.entries(value)) {
            storage.set(key, entry);
          }
        }),
        get: vi.fn(async (key: string) => ({
          [key]: storage.get(key),
        })),
      },
    },
  },
}));

describe('formatSummaryParagraphs', () => {
  it('splits blank-line separated paragraphs', () => {
    expect(formatSummaryParagraphs('One.\n\nTwo.\n\nThree.')).toEqual([
      'One.',
      'Two.',
      'Three.',
    ]);
  });

  it('falls back to a single paragraph', () => {
    expect(formatSummaryParagraphs('  Single block  ')).toEqual(['Single block']);
  });
});

describe('resolveSummaryFontPx', () => {
  it('falls back when unset or invalid', () => {
    expect(resolveSummaryFontPx(undefined)).toBe(16);
    expect(resolveSummaryFontPx('abc')).toBe(16);
  });

  it('uses a configured value', () => {
    expect(resolveSummaryFontPx('20')).toBe(20);
  });

  it('clamps to the allowed range', () => {
    expect(resolveSummaryFontPx('4')).toBe(12);
    expect(resolveSummaryFontPx('100')).toBe(28);
  });
});

describe('showSummaryOverlay', () => {
  beforeEach(() => {
    localStorage.clear();
    storage.clear();
  });
  it('shows cache notice when summary came from cache', () => {
    const root = showSummaryOverlay({
      summary: 'Cached summary text.',
      isListingFeed: false,
      fromCache: true,
    });
    const notice = root.querySelector('.pts-cache');
    expect(notice?.textContent).toBe(getUiStrings().summarize.cacheNotice);
    root.remove();
  });

  it('hides cache notice for fresh summaries', () => {
    const root = showSummaryOverlay({
      summary: 'Fresh summary text.',
      isListingFeed: false,
      fromCache: false,
    });
    expect(root.querySelector('.pts-cache')).toBeNull();
    root.remove();
  });

  it('cycles panel position on button click', () => {
    const root = showSummaryOverlay({
      summary: 'Text.',
      isListingFeed: false,
    });
    const positionBtn = root.querySelector('button[data-role="position"]')!;
    expect(root.className).toContain('pts-pos-right');
    positionBtn.dispatchEvent(new Event('click'));
    expect(root.className).toContain('pts-pos-center');
    positionBtn.dispatchEvent(new Event('click'));
    expect(root.className).toContain('pts-pos-left');
    positionBtn.dispatchEvent(new Event('click'));
    expect(root.className).toContain('pts-pos-right');
    root.remove();
  });

  it('adjusts body font size with zoom buttons', () => {
    const root = showSummaryOverlay({
      summary: 'Text.',
      isListingFeed: false,
    });
    const body = root.querySelector('.pts-body') as HTMLElement;
    const smaller = root.querySelector('button[data-role="font-smaller"]')!;
    const larger = root.querySelector('button[data-role="font-larger"]')!;
    const initial = parseFloat(body.style.fontSize);
    smaller.dispatchEvent(new Event('click'));
    const afterSmaller = parseFloat(body.style.fontSize);
    larger.dispatchEvent(new Event('click'));
    larger.dispatchEvent(new Event('click'));
    const afterLarger = parseFloat(body.style.fontSize);
    expect(afterSmaller).toBeLessThan(initial);
    expect(afterLarger).toBeGreaterThan(afterSmaller);
    root.remove();
  });

  it('uses configured panel position', () => {
    const root = showSummaryOverlay({
      summary: 'Text.',
      isListingFeed: false,
      position: 'left',
    });
    expect(root.className).toContain('pts-pos-left');
    root.remove();
  });

  it('restores persisted font size', () => {
    localStorage.setItem('page-translate-summary-prefs', JSON.stringify({
      fontSizePx: 22,
    }));
    const root = showSummaryOverlay({
      summary: 'Text.',
      isListingFeed: false,
    });
    expect(parseFloat((root.querySelector('.pts-body') as HTMLElement).style.fontSize)).toBe(22);
    root.remove();
  });
});
