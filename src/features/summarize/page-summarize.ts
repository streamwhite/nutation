import { collectPageTextForSummary } from '@/features/summarize/collect-page-text';
import { MESSAGE_TYPES } from '@/shared/constants';
import { DEFAULT_LOCALE, formatMessage } from '@/i18n';
import type { ExtensionSettings } from '@/shared/settings';
import type { SummaryOverlayOptions } from '@/features/summarize/overlay';
import type { SummarizePageResponse, SummarizeTextResponse } from '@/features/translate/types';

const OVERLAY_MODULE_PATH = '/content-scripts/esm/overlay.js';

type OverlayModule = {
  showSummaryOverlay: (options: SummaryOverlayOptions, doc?: Document) => HTMLElement;
};

async function loadOverlayModule(): Promise<OverlayModule> {
  return import(
    /* @vite-ignore */ browser.runtime.getURL(OVERLAY_MODULE_PATH)
  ) as Promise<OverlayModule>;
}

export async function summarizeCurrentPage(
  settings: ExtensionSettings,
): Promise<SummarizePageResponse> {
  try {
    const collected = collectPageTextForSummary();
    if (!collected.text) {
      return { ok: false, error: formatMessage(DEFAULT_LOCALE, 'summarize.emptyPage') };
    }

    const response = await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.SUMMARIZE_TEXT,
      text: collected.text,
      pageUrl: location.href,
      targetLang: settings.targetLang,
      settings,
      isListingFeed: collected.isListingFeed,
    }) as SummarizeTextResponse;

    if (!response.ok) {
      return { ok: false, error: response.error };
    }

    const { showSummaryOverlay } = await loadOverlayModule();
    showSummaryOverlay({
      summary: response.summary,
      isListingFeed: collected.isListingFeed,
      fromCache: response.fromCache,
      position: settings.summaryPosition,
      uiLocale: settings.uiLocale,
    });

    return {
      ok: true,
      summary: response.summary,
      isListingFeed: collected.isListingFeed,
      fromCache: response.fromCache,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
