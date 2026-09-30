import type { IntlShape } from 'react-intl';
import { formatCacheRate, statusMessage } from '@/features/popup/status';
import type { MultiTabSummary } from '@/features/popup/selected-tabs';
import type { TabStatus } from '@/features/translate/types';

export function formatStatus(
  intl: IntlShape,
  status: TabStatus,
  tabCount: number,
): string {
  const rate = formatCacheRate(status.cacheHits, status.cacheLookups);
  const { id, values } = statusMessage(status.active, tabCount, rate);
  return intl.formatMessage({ id }, values);
}

export function contentScriptUnavailableMessage(
  intl: IntlShape,
  detail: string,
): string {
  return intl.formatMessage({ id: 'popup.contentScriptUnavailable' }, { detail });
}

export function noTranslatableTabsMessage(
  intl: IntlShape,
  restrictedCount: number,
): string {
  return intl.formatMessage({
    id: restrictedCount > 0 ? 'popup.restrictedPage' : 'popup.noSelectedTabs',
  });
}

export function skippedRestrictedMessage(intl: IntlShape, count: number): string {
  return intl.formatMessage({ id: 'popup.skippedRestrictedTabs' }, { count });
}

export function startedTabsMessage(
  intl: IntlShape,
  summary: MultiTabSummary,
  total: number,
): string {
  return intl.formatMessage(
    { id: 'popup.startedTabs' },
    { started: summary.started, total },
  );
}

export function restoredTabsMessage(
  intl: IntlShape,
  summary: MultiTabSummary,
  total: number,
): string {
  return intl.formatMessage(
    { id: 'popup.restoredTabs' },
    { started: summary.started, total },
  );
}
