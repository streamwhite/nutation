import { collectPageTextForSummary } from '@/features/summarize/collect-page-text';
import { showSummaryOverlay } from '@/features/summarize/overlay';
import { MESSAGE_TYPES } from '@/shared/constants';
import { getUiStrings } from '@/shared/ui-strings';
import type { ExtensionSettings } from '@/shared/settings';
import type { SummarizePageResponse, SummarizeTextResponse } from '@/features/translate/types';

export async function summarizeCurrentPage(
  settings: ExtensionSettings,
): Promise<SummarizePageResponse> {
  try {
    const collected = collectPageTextForSummary();
    if (!collected.text) {
      return { ok: false, error: getUiStrings().summarize.emptyPage };
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

    showSummaryOverlay({
      summary: response.summary,
      isListingFeed: collected.isListingFeed,
      fromCache: response.fromCache,
      position: settings.summaryPosition,
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
