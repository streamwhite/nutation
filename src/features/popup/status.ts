import type { MessageId, MessageValues } from '@/i18n';

export type StatusMessage = {
  id: MessageId;
  values?: MessageValues;
};

export function formatCacheRate(hits?: number, lookups?: number): string | null {
  if (typeof hits !== 'number' || typeof lookups !== 'number' || lookups <= 0) {
    return null;
  }
  return `${Math.round((hits / lookups) * 100)}%`;
}

export function statusMessage(
  active: boolean,
  tabCount: number,
  cacheRate: string | null,
): StatusMessage {
  if (tabCount > 1) {
    return active
      ? { id: 'popup.status.translatingTabs', values: { count: tabCount } }
      : { id: 'popup.status.idle' };
  }
  if (active) {
    return cacheRate
      ? { id: 'popup.status.translatingWithCache', values: { rate: cacheRate } }
      : { id: 'popup.status.translating' };
  }
  return cacheRate
    ? { id: 'popup.status.idleWithCache', values: { rate: cacheRate } }
    : { id: 'popup.status.idle' };
}
