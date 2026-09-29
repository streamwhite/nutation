import { describe, expect, it } from 'vitest';
import { isSameTranslationLanguage } from '@/features/translate/language-match';

describe('isSameTranslationLanguage', () => {
  it('matches french regional variants by primary subtag', () => {
    expect(isSameTranslationLanguage('fr', 'fr-FR')).toBe(true);
    expect(isSameTranslationLanguage('fr-FR', 'fr')).toBe(true);
    expect(isSameTranslationLanguage('fr_CA', 'fr')).toBe(true);
  });

  it('matches english regional variants and rejects different languages', () => {
    expect(isSameTranslationLanguage('en', 'en-US')).toBe(true);
    expect(isSameTranslationLanguage('en-GB', 'en')).toBe(true);
    expect(isSameTranslationLanguage('en', 'fr')).toBe(false);
  });

  it('matches portuguese regional variants by primary subtag', () => {
    expect(isSameTranslationLanguage('pt', 'pt-BR')).toBe(true);
    expect(isSameTranslationLanguage('pt-BR', 'pt-PT')).toBe(true);
  });

  it('treats simplified chinese variants as the same', () => {
    expect(isSameTranslationLanguage('zh-CN', 'zh-Hans')).toBe(true);
    expect(isSameTranslationLanguage('zh-Hans-CN', 'zh-CN')).toBe(true);
    expect(isSameTranslationLanguage('zh', 'zh-CN')).toBe(true);
  });

  it('treats traditional chinese variants as the same', () => {
    expect(isSameTranslationLanguage('zh-TW', 'zh-HK')).toBe(true);
    expect(isSameTranslationLanguage('zh-Hant', 'zh-TW')).toBe(true);
  });

  it('treats simplified and traditional chinese as different', () => {
    expect(isSameTranslationLanguage('zh-CN', 'zh-TW')).toBe(false);
    expect(isSameTranslationLanguage('zh-Hans', 'zh-Hant')).toBe(false);
  });

  it('does not match when page language is empty', () => {
    expect(isSameTranslationLanguage('', 'zh-CN')).toBe(false);
    expect(isSameTranslationLanguage('   ', 'en')).toBe(false);
  });

  it('normalizes case and underscore separators', () => {
    expect(isSameTranslationLanguage('EN_US', 'en')).toBe(true);
    expect(isSameTranslationLanguage('Zh_Cn', 'zh-Hans')).toBe(true);
  });
});
