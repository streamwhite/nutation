import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from '@/features/translate/concurrency';

describe('runWithConcurrency', () => {
  it('runs work with limited parallelism', async () => {
    let active = 0;
    let maxActive = 0;

    const results = await runWithConcurrency([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;
      return value * 2;
    });

    expect(results).toEqual([2, 4, 6, 8]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
