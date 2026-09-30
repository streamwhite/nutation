import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatSummaryParagraphs,
  resolveSummaryFontPx,
  SummaryOverlay,
} from '@/features/summarize/overlay';
import { DEFAULT_LOCALE, getMessages } from '@/i18n';
import type { SummaryPosition } from '@/features/summarize/summary-position';

vi.mock('@/assets/globals.css?inline', () => ({ default: '' }));

vi.mock('wxt/browser', () => {
  const storage = new Map<string, unknown>();
  return {
    browser: {
      storage: {
        local: {
          set: vi.fn(async (value: Record<string, unknown>) => {
            for (const [key, entry] of Object.entries(value)) {
              storage.set(key, entry);
            }
          }),
          get: vi.fn(async (key: string) => ({ [key]: storage.get(key) })),
        },
      },
    },
  };
});

afterEach(cleanup);

function renderOverlay(options: {
  summary?: string;
  isListingFeed?: boolean;
  fromCache?: boolean;
  position?: SummaryPosition;
  onClose?: () => void;
} = {}) {
  return render(
    <IntlProvider
      locale={DEFAULT_LOCALE}
      defaultLocale={DEFAULT_LOCALE}
      messages={getMessages(DEFAULT_LOCALE)}
      onError={() => undefined}
    >
      <SummaryOverlay
        summary={options.summary ?? 'Text.'}
        isListingFeed={options.isListingFeed ?? false}
        fromCache={options.fromCache ?? false}
        initialPosition={options.position ?? 'right'}
        initialFontSizePx={16}
        onClose={options.onClose ?? (() => undefined)}
      />
    </IntlProvider>,
  );
}

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

  it('clamps to the allowed range', () => {
    expect(resolveSummaryFontPx('4')).toBe(12);
    expect(resolveSummaryFontPx('100')).toBe(28);
  });
});

describe('SummaryOverlay', () => {
  it('shows the cache notice when the summary came from cache', () => {
    renderOverlay({ fromCache: true });
    expect(screen.getByText('Loaded from cache for this page.')).toBeTruthy();
  });

  it('hides the cache notice for fresh summaries', () => {
    renderOverlay({ fromCache: false });
    expect(screen.queryByText('Loaded from cache for this page.')).toBeNull();
  });

  it('warns about listing pages', () => {
    renderOverlay({ isListingFeed: true });
    expect(screen.getByText(/list or feed page/i)).toBeTruthy();
  });

  it('cycles panel position on button click', () => {
    renderOverlay({ position: 'right' });
    const dialog = screen.getByRole('dialog');
    const button = screen.getByRole('button', { name: 'Panel position: left / center / right' });

    expect(dialog.className).toContain('justify-end');
    fireEvent.click(button);
    expect(dialog.className).toContain('justify-center');
    fireEvent.click(button);
    expect(dialog.className).toContain('justify-start');
    fireEvent.click(button);
    expect(dialog.className).toContain('justify-end');
  });

  it('adjusts body font size with the zoom buttons', () => {
    renderOverlay();
    const body = screen.getByText('Text.').parentElement as HTMLElement;
    expect(body.style.fontSize).toBe('16px');

    fireEvent.click(screen.getByRole('button', { name: 'Increase text size' }));
    expect(body.style.fontSize).toBe('18px');

    fireEvent.click(screen.getByRole('button', { name: 'Decrease text size' }));
    expect(body.style.fontSize).toBe('16px');
  });

  it('closes on the close button and on Escape', () => {
    const onClose = vi.fn();
    renderOverlay({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
