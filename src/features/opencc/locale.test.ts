import { describe, expect, it } from 'vitest';
import {
  isPrimarilyChineseText,
  isSimplifiedChineseTarget,
  isTraditionalChineseLang,
  shouldUseOpenCC,
} from '@/features/opencc/locale';

describe('isSimplifiedChineseTarget', () => {
  it('accepts common zh-CN tags', () => {
    expect(isSimplifiedChineseTarget('zh-CN')).toBe(true);
    expect(isSimplifiedChineseTarget('zh-Hans')).toBe(true);
    expect(isSimplifiedChineseTarget('zh_cn')).toBe(true);
    expect(isSimplifiedChineseTarget('zh-Hans-CN')).toBe(true);
  });

  it('rejects traditional and other languages', () => {
    expect(isSimplifiedChineseTarget('zh-TW')).toBe(false);
    expect(isSimplifiedChineseTarget('zh-Hant-TW')).toBe(false);
    expect(isSimplifiedChineseTarget('en')).toBe(false);
  });
});

describe('isTraditionalChineseLang', () => {
  it('accepts common zh-TW and zh-Hant variants', () => {
    expect(isTraditionalChineseLang('zh-TW')).toBe(true);
    expect(isTraditionalChineseLang('zh-Hant')).toBe(true);
    expect(isTraditionalChineseLang('zh-Hant-TW')).toBe(true);
    expect(isTraditionalChineseLang('zh-Hant-HK')).toBe(true);
    expect(isTraditionalChineseLang('zh-HK')).toBe(true);
    expect(isTraditionalChineseLang('zh-MO')).toBe(true);
    expect(isTraditionalChineseLang('zh_tw')).toBe(true);
    expect(isTraditionalChineseLang('zh-CHT')).toBe(true);
    expect(isTraditionalChineseLang('zh-traditional')).toBe(true);
  });

  it('rejects simplified and non-chinese tags', () => {
    expect(isTraditionalChineseLang('zh-CN')).toBe(false);
    expect(isTraditionalChineseLang('zh-Hans')).toBe(false);
    expect(isTraditionalChineseLang('zh-Hans-CN')).toBe(false);
    expect(isTraditionalChineseLang('en')).toBe(false);
  });
});

describe('isPrimarilyChineseText', () => {
  it('detects traditional chinese phrases', () => {
    expect(isPrimarilyChineseText('使用軟體與螢幕')).toBe(true);
  });

  it('rejects english text', () => {
    expect(isPrimarilyChineseText('Hello world')).toBe(false);
  });
});

describe('shouldUseOpenCC', () => {
  it('uses opencc for chinese text targeting zh-CN', () => {
    expect(shouldUseOpenCC('臺灣軟體', 'zh-CN')).toBe(true);
  });

  it('uses opencc for chinese text targeting zh-TW', () => {
    expect(shouldUseOpenCC('台湾软件', 'zh-TW')).toBe(true);
    expect(shouldUseOpenCC('软件', 'zh-TW', 'zh-CN')).toBe(true);
  });

  it('uses opencc when source lang is a traditional variant', () => {
    expect(shouldUseOpenCC('軟體', 'zh-CN', 'zh-Hant-TW')).toBe(true);
    expect(shouldUseOpenCC('軟體', 'zh-CN', 'zh-TW')).toBe(true);
  });

  it('keeps english on the llm path', () => {
    expect(shouldUseOpenCC('Hello world', 'zh-CN')).toBe(false);
    expect(shouldUseOpenCC('Hello world', 'zh-TW')).toBe(false);
    expect(shouldUseOpenCC('Hello world', 'zh-CN', 'zh-Hant-TW')).toBe(false);
  });

  it('uses opencc for mixed chinese text when the source is a chinese variant', () => {
    expect(shouldUseOpenCC('iPhone 15 Pro 開箱評測', 'zh-CN', 'zh-TW')).toBe(true);
    expect(shouldUseOpenCC('台積電 TSMC 2330', 'zh-CN', 'zh-Hant-TW')).toBe(true);
  });

  it('keeps japanese text on the llm path', () => {
    expect(shouldUseOpenCC('東京タワー', 'zh-CN')).toBe(false);
    expect(shouldUseOpenCC('東京タワー', 'zh-CN', 'ja')).toBe(false);
  });
});

describe('resolveElementLang', () => {
  it('reads nearest lang including zh-Hant-TW', async () => {
    const { resolveElementLang } = await import('@/features/opencc/locale');
    document.documentElement.lang = 'en';
    document.body.innerHTML = '<div lang="zh-Hant-TW"><p id="n">軟體</p></div>';
    const node = document.querySelector('#n');
    expect(resolveElementLang(node)).toBe('zh-Hant-TW');
  });
});
