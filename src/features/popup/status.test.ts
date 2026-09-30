import { describe, expect, it } from 'vitest';
import { formatCacheRate, statusMessage } from '@/features/popup/status';

describe('formatCacheRate', () => {
  it('omits the rate when there are no lookups', () => {
    expect(formatCacheRate(1, 0)).toBeNull();
    expect(formatCacheRate(undefined, 4)).toBeNull();
  });

  it('rounds the cache hit rate', () => {
    expect(formatCacheRate(1, 4)).toBe('25%');
  });
});

describe('statusMessage', () => {
  it('uses the single-tab status with cache rate', () => {
    expect(statusMessage(true, 1, null)).toEqual({ id: 'popup.status.translating' });
    expect(statusMessage(true, 1, '25%')).toEqual({
      id: 'popup.status.translatingWithCache',
      values: { rate: '25%' },
    });
    expect(statusMessage(false, 1, null)).toEqual({ id: 'popup.status.idle' });
  });

  it('mentions the tab count when translating several tabs', () => {
    expect(statusMessage(true, 3, null)).toEqual({
      id: 'popup.status.translatingTabs',
      values: { count: 3 },
    });
    expect(statusMessage(false, 2, null)).toEqual({ id: 'popup.status.idle' });
  });
});
