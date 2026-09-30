import { describe, expect, it } from 'vitest';
import {
  findTargetLanguage,
  formatLanguageLabel,
  resolveTargetLanguageCode,
} from '@/shared/languages';
import { searchTargetLanguages } from '@/features/options/language-search';

describe('findTargetLanguage', () => {
  it('finds languages by code', () => {
    expect(findTargetLanguage('zh-CN')?.name).toBe('Chinese (Simplified)');
    expect(findTargetLanguage('ja')?.nativeName).toBe('日本語');
    expect(findTargetLanguage('nope')).toBeNull();
  });
});

describe('resolveTargetLanguageCode', () => {
  it('keeps known codes and falls back for empty', () => {
    expect(resolveTargetLanguageCode('en')).toBe('en');
    expect(resolveTargetLanguageCode('')).toBe('zh-CN');
    expect(resolveTargetLanguageCode('xx-CUSTOM')).toBe('xx-CUSTOM');
  });
});

describe('formatLanguageLabel', () => {
  it('includes name native name and code', () => {
    const language = findTargetLanguage('zh-CN');
    expect(language).not.toBeNull();
    expect(formatLanguageLabel(language!)).toContain('Chinese (Simplified)');
    expect(formatLanguageLabel(language!)).toContain('zh-CN');
  });
});

describe('searchTargetLanguages', () => {
  it('filters by name native name or code', () => {
    expect(searchTargetLanguages('simpl').some((item) => item.code === 'zh-CN')).toBe(true);
    expect(searchTargetLanguages('日本語').some((item) => item.code === 'ja')).toBe(true);
    expect(searchTargetLanguages('ko').some((item) => item.code === 'ko')).toBe(true);
  });
});
