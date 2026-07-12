import { describe, expect, it } from 'vitest';
import { convertBatchWithOpenCC, convertTwToCn } from '@/features/opencc/convert';

describe('convertTwToCn', () => {
  it('converts taiwan phrases to simplified chinese', () => {
    expect(convertTwToCn('軟體')).toBe('软件');
    expect(convertTwToCn('螢幕')).toBe('屏幕');
    expect(convertTwToCn('滑鼠')).toBe('鼠标');
  });
});

describe('convertBatchWithOpenCC', () => {
  it('maps ids to converted text', () => {
    expect(convertBatchWithOpenCC([
      { id: '0', text: '軟體' },
      { id: '1', text: '螢幕' },
    ])).toEqual([
      { id: '0', text: '软件' },
      { id: '1', text: '屏幕' },
    ]);
  });
});
