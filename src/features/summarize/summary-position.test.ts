import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUMMARY_POSITION,
  SUMMARY_POSITIONS,
  resolveSummaryPosition,
} from '@/features/summarize/summary-position';

describe('resolveSummaryPosition', () => {
  it('accepts known positions', () => {
    for (const position of SUMMARY_POSITIONS) {
      expect(resolveSummaryPosition(position)).toBe(position);
    }
  });

  it('falls back to default for invalid values', () => {
    expect(resolveSummaryPosition(undefined)).toBe(DEFAULT_SUMMARY_POSITION);
    expect(resolveSummaryPosition(null)).toBe(DEFAULT_SUMMARY_POSITION);
    expect(resolveSummaryPosition('top')).toBe(DEFAULT_SUMMARY_POSITION);
    expect(resolveSummaryPosition(1)).toBe(DEFAULT_SUMMARY_POSITION);
  });
});
