import { describe, expect, it } from 'vitest';
import { mergeTabStatuses } from '@/features/content-script/frame-messaging';
import type { TabStatus } from '@/features/translate/types';

describe('mergeTabStatuses', () => {
  it('sums translated counts and keeps active when any frame is active', () => {
    const merged = mergeTabStatuses([
      {
        active: true,
        error: null,
        translatedCount: 3,
        timing: {
          elapsedMs: 1200,
          firstVisibleMs: 900,
          stages: {
            api_request: { count: 2, totalMs: 800, avgMs: 400, maxMs: 500 },
          },
        },
      },
      {
        active: false,
        error: null,
        translatedCount: 5,
        timing: {
          elapsedMs: 1500,
          firstVisibleMs: 700,
          stages: {
            api_request: { count: 1, totalMs: 300, avgMs: 300, maxMs: 300 },
          },
        },
      },
    ] satisfies TabStatus[]);

    expect(merged.active).toBe(true);
    expect(merged.translatedCount).toBe(8);
    expect(merged.timing?.firstVisibleMs).toBe(700);
    expect(merged.timing?.stages.api_request.totalMs).toBe(1100);
    expect(merged.timing?.stages.api_request.count).toBe(3);
  });
});
