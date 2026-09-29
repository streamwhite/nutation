import {
  getRestrictedPageMessage,
  isRestrictedUrl,
} from '@/features/content-script/recover';

export type PopupTab = {
  id: number;
  url: string;
};

export type MultiTabResult =
  | { ok: true; tabId: number }
  | { ok: false; tabId: number; error: string };

export type MultiTabSummary = {
  started: number;
  failed: number;
  firstError: string | null;
  firstFailedTabId: number | null;
};

export function normalizePopupTabs(
  tabs: Array<{ id?: number; url?: string | null }>,
): PopupTab[] {
  return tabs
    .filter((tab): tab is { id: number; url?: string | null } => typeof tab.id === 'number')
    .map((tab) => ({ id: tab.id, url: tab.url ?? '' }));
}

export function partitionTranslatableTabs(tabs: PopupTab[]): {
  translatable: PopupTab[];
  restricted: PopupTab[];
} {
  const translatable: PopupTab[] = [];
  const restricted: PopupTab[] = [];
  for (const tab of tabs) {
    if (isRestrictedUrl(tab.url)) {
      restricted.push(tab);
    } else {
      translatable.push(tab);
    }
  }
  return { translatable, restricted };
}

export function summarizeMultiTabResults(results: MultiTabResult[]): MultiTabSummary {
  let started = 0;
  let failed = 0;
  let firstError: string | null = null;
  let firstFailedTabId: number | null = null;

  for (const result of results) {
    if (result.ok) {
      started += 1;
      continue;
    }
    failed += 1;
    if (!firstError) {
      firstError = result.error;
      firstFailedTabId = result.tabId;
    }
  }

  return { started, failed, firstError, firstFailedTabId };
}

export function formatSelectedTabsStatus(tabCount: number, active: boolean): string {
  if (!active) {
    return 'Idle';
  }
  if (tabCount <= 1) {
    return 'Translating…';
  }
  return `Translating ${tabCount} tabs…`;
}

export function formatMultiTabStartLabel(tabCount: number): string {
  if (tabCount <= 1) {
    return 'Starting…';
  }
  return `Starting ${tabCount} tabs…`;
}

export function formatTranslateButtonLabel(tabCount: number): string {
  if (tabCount <= 1) {
    return 'Translate page';
  }
  return `Translate ${tabCount} tabs`;
}

export function formatRestoreButtonLabel(tabCount: number): string {
  if (tabCount <= 1) {
    return 'Restore original';
  }
  return `Restore ${tabCount} tabs`;
}

export function noTranslatableTabsMessage(restrictedCount: number): string {
  if (restrictedCount > 0) {
    return getRestrictedPageMessage();
  }
  return 'No selected tabs found';
}
