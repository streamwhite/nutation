import { describe, expect, it } from 'vitest';
import { CONTENT_SCRIPT_FILE } from '@/shared/constants';

describe('content script fallback path', () => {
  it('uses the wxt content script bundle path', () => {
    expect(CONTENT_SCRIPT_FILE).toBe('content-scripts/content.js');
  });
});
