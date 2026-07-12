import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/shared/format-bytes';

describe('formatBytes', () => {
  it('formats zero and small values', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes and megabytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });
});
