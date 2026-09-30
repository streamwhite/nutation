import type { MessageId } from '@/i18n';

export const SUMMARY_POSITIONS = ['right', 'center', 'left'] as const;

export type SummaryPosition = (typeof SUMMARY_POSITIONS)[number];

export const DEFAULT_SUMMARY_POSITION: SummaryPosition = 'right';

export const SUMMARY_POSITION_LABEL_IDS: Record<SummaryPosition, MessageId> = {
  right: 'options.summaryPosition.right',
  center: 'options.summaryPosition.center',
  left: 'options.summaryPosition.left',
};

export function isSummaryPosition(value: unknown): value is SummaryPosition {
  return typeof value === 'string'
    && (SUMMARY_POSITIONS as readonly string[]).includes(value);
}

export function resolveSummaryPosition(value: unknown): SummaryPosition {
  return isSummaryPosition(value) ? value : DEFAULT_SUMMARY_POSITION;
}
