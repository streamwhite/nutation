import { describe, expect, it } from 'vitest';
import { formatTimingSummary, StageTimer } from '@/features/translate/stage-timer';

describe('StageTimer', () => {
  it('records stage durations and first visible time from session start', () => {
    const timer = new StageTimer();
    timer.reset();
    timer.record('api_request', 1200);
    timer.record('api_request', 800);
    timer.markFirstVisible();

    const summary = timer.getSummary();
    expect(summary.firstVisibleMs).toBeGreaterThanOrEqual(0);
    expect(summary.firstVisibleMs).toBeLessThan(50);
    expect(summary.stages.api_request).toEqual({
      count: 2,
      totalMs: 2000,
      avgMs: 1000,
      maxMs: 1200,
    });
  });

  it('resets elapsed and first visible on a new session', () => {
    const timer = new StageTimer();
    timer.markFirstVisible();
    timer.reset();

    const summary = timer.getSummary();
    expect(summary.firstVisibleMs).toBeNull();
    expect(summary.elapsedMs).toBeLessThan(20);
    expect(summary.stages).toEqual({});
  });

  it('freezes elapsed time when session ends', () => {
    const timer = new StageTimer();
    timer.reset();
    timer.record('api_request', 500);
    timer.freeze();

    const frozen = timer.getSummary().elapsedMs;
    const stillFrozen = timer.getSummary().elapsedMs;
    expect(stillFrozen).toBe(frozen);
  });

  it('merges batch stage stats without touching first visible', () => {
    const timer = new StageTimer();
    timer.reset();
    timer.markFirstVisible();
    const firstVisible = timer.getSummary().firstVisibleMs;

    timer.mergeSummary({
      elapsedMs: 10,
      firstVisibleMs: 9999,
      stages: {
        cache_lookup: { count: 1, totalMs: 5, avgMs: 5, maxMs: 5 },
        api_request: { count: 1, totalMs: 900, avgMs: 900, maxMs: 900 },
      },
    });

    expect(timer.getSummary().firstVisibleMs).toBe(firstVisible);
    expect(timer.getSummary().stages.api_request?.avgMs).toBe(900);
  });
});

describe('formatTimingSummary', () => {
  it('formats key stages with totals for popup display', () => {
    const text = formatTimingSummary({
      elapsedMs: 5000,
      firstVisibleMs: 700,
      stages: {
        api_request: { count: 3, totalMs: 4200, avgMs: 1400, maxMs: 1800 },
        collect_dom: { count: 2, totalMs: 40, avgMs: 20, maxMs: 25 },
      },
    });

    expect(text).toContain('first 700ms');
    expect(text).toContain('session 5000ms');
    expect(text).toContain('api_request 4200ms (3x)');
  });
});
