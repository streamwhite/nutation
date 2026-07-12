import { TIMING_LOG_PREFIX } from '@/shared/constants';

export type StageStats = {
  count: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
};

export type StageTimingSummary = {
  elapsedMs: number;
  firstVisibleMs: number | null;
  stages: Record<string, StageStats>;
};

type StageTotals = {
  count: number;
  totalMs: number;
  maxMs: number;
};

export class StageTimer {
  private readonly totals = new Map<string, StageTotals>();
  private readonly active = new Map<string, number>();
  private startedAt = performance.now();
  private frozenElapsedMs: number | null = null;
  private firstVisibleMs: number | null = null;

  reset(): void {
    this.totals.clear();
    this.active.clear();
    this.startedAt = performance.now();
    this.frozenElapsedMs = null;
    this.firstVisibleMs = null;
  }

  freeze(): void {
    if (this.frozenElapsedMs === null) {
      this.frozenElapsedMs = Math.round(performance.now() - this.startedAt);
    }
  }

  start(stage: string): void {
    this.active.set(stage, performance.now());
  }

  end(stage: string): number {
    const started = this.active.get(stage);
    if (started === undefined) {
      return 0;
    }
    this.active.delete(stage);
    const durationMs = performance.now() - started;
    this.record(stage, durationMs);
    return durationMs;
  }

  record(stage: string, durationMs: number): void {
    const current = this.totals.get(stage) ?? { count: 0, totalMs: 0, maxMs: 0 };
    current.count += 1;
    current.totalMs += durationMs;
    current.maxMs = Math.max(current.maxMs, durationMs);
    this.totals.set(stage, current);
  }

  mergeStage(stage: string, stats: StageStats): void {
    const current = this.totals.get(stage) ?? { count: 0, totalMs: 0, maxMs: 0 };
    current.count += stats.count;
    current.totalMs += stats.totalMs;
    current.maxMs = Math.max(current.maxMs, stats.maxMs);
    this.totals.set(stage, current);
  }

  mergeSummary(summary: StageTimingSummary): void {
    for (const [stage, stats] of Object.entries(summary.stages)) {
      this.mergeStage(stage, stats);
    }
  }

  markFirstVisible(): void {
    if (this.firstVisibleMs !== null) {
      return;
    }
    this.firstVisibleMs = Math.round(performance.now() - this.startedAt);
  }

  getSummary(): StageTimingSummary {
    const stages: Record<string, StageStats> = {};
    for (const [name, stats] of this.totals.entries()) {
      stages[name] = {
        count: stats.count,
        totalMs: Math.round(stats.totalMs),
        avgMs: Math.round(stats.totalMs / stats.count),
        maxMs: Math.round(stats.maxMs),
      };
    }

    const elapsedMs = this.frozenElapsedMs
      ?? Math.round(performance.now() - this.startedAt);

    return {
      elapsedMs,
      firstVisibleMs: this.firstVisibleMs,
      stages,
    };
  }

  logSummary(label = 'session'): void {
    console.info(TIMING_LOG_PREFIX, label, this.getSummary());
  }
}

export async function measureAsync<T>(
  timer: StageTimer,
  stage: string,
  task: () => Promise<T>,
): Promise<T> {
  timer.start(stage);
  try {
    return await task();
  } finally {
    timer.end(stage);
  }
}

export function formatTimingSummary(summary: StageTimingSummary): string {
  const parts: string[] = [];
  if (summary.firstVisibleMs !== null) {
    parts.push(`first ${summary.firstVisibleMs}ms`);
  }
  parts.push(`session ${summary.elapsedMs}ms`);

  const orderedStages = [
    'collect_dom',
    'build_chunks',
    'cache_hit',
    'opencc_convert',
    'api_request',
    'apply_dom',
  ];

  for (const stage of orderedStages) {
    const stats = summary.stages[stage];
    if (!stats) {
      continue;
    }
    parts.push(`${stage} ${stats.totalMs}ms (${stats.count}x)`);
  }

  return parts.join(' | ');
}
