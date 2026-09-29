import { describe, expect, it } from 'vitest';
import {
  convertBatchWithOpenCC,
  convertChineseScript,
  getOpenCCCacheModel,
  resolveOpenCCDirection,
} from '@/features/opencc/convert';

describe('resolveOpenCCDirection', () => {
  it('maps simplified targets to traditional-to-simplified', () => {
    expect(resolveOpenCCDirection('zh-CN')).toBe('t2s');
    expect(resolveOpenCCDirection('zh-Hans')).toBe('t2s');
  });

  it('maps traditional targets to simplified-to-traditional', () => {
    expect(resolveOpenCCDirection('zh-TW')).toBe('s2t');
    expect(resolveOpenCCDirection('zh-Hant')).toBe('s2t');
    expect(resolveOpenCCDirection('zh-HK')).toBe('s2t-hk');
    expect(resolveOpenCCDirection('zh-MO')).toBe('s2t-hk');
  });

  it('returns null for non-chinese targets', () => {
    expect(resolveOpenCCDirection('en')).toBeNull();
  });
});

describe('convertChineseScript', () => {
  it('converts traditional to simplified for zh-CN', () => {
    expect(convertChineseScript('軟體', 'zh-CN')).toBe('软件');
    expect(convertChineseScript('螢幕', 'zh-CN')).toBe('屏幕');
  });

  it('converts simplified to traditional for zh-TW', () => {
    expect(convertChineseScript('软件', 'zh-TW')).toBe('軟體');
    expect(convertChineseScript('鼠标', 'zh-TW')).toBe('滑鼠');
  });
});

describe('convertBatchWithOpenCC', () => {
  it('maps ids for both directions', () => {
    expect(convertBatchWithOpenCC([
      { id: '0', text: '軟體' },
    ], 'zh-CN')).toEqual([
      { id: '0', text: '软件' },
    ]);
    expect(convertBatchWithOpenCC([
      { id: '0', text: '软件' },
    ], 'zh-TW')).toEqual([
      { id: '0', text: '軟體' },
    ]);
  });
});

describe('getOpenCCCacheModel', () => {
  it('uses distinct cache models per direction', () => {
    expect(getOpenCCCacheModel('zh-CN')).toBe('opencc-tw2sp');
    expect(getOpenCCCacheModel('zh-TW')).toBe('opencc-cn2twp');
    expect(getOpenCCCacheModel('zh-HK')).toBe('opencc-cn2hk');
  });
});
