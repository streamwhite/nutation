import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRANSLATION_MODE,
  isTranslationMode,
  resolveTranslationMode,
  TRANSLATION_MODE_NOTE_IDS,
} from '@/shared/translation-mode';
import { getMessages } from '@/i18n';

describe('isTranslationMode', () => {
  it('accepts known modes only', () => {
    expect(isTranslationMode('bulk')).toBe(true);
    expect(isTranslationMode('progressive')).toBe(true);
    expect(isTranslationMode('other')).toBe(false);
    expect(isTranslationMode(null)).toBe(false);
  });
});

describe('resolveTranslationMode', () => {
  it('defaults to bulk', () => {
    expect(DEFAULT_TRANSLATION_MODE).toBe('bulk');
    expect(resolveTranslationMode(undefined)).toBe('bulk');
    expect(resolveTranslationMode('nope')).toBe('bulk');
  });

  it('keeps valid modes', () => {
    expect(resolveTranslationMode('progressive')).toBe('progressive');
    expect(resolveTranslationMode('bulk')).toBe('bulk');
  });
});

describe('translation mode notes', () => {
  it('explains tradeoffs for both modes', () => {
    const en = getMessages('en');
    expect(en[TRANSLATION_MODE_NOTE_IDS.bulk]).toMatch(/whole page/i);
    expect(en[TRANSLATION_MODE_NOTE_IDS.bulk]).toMatch(/scroll/i);
    expect(en[TRANSLATION_MODE_NOTE_IDS.progressive]).toMatch(/viewport/i);
    expect(en[TRANSLATION_MODE_NOTE_IDS.progressive]).toMatch(/sooner|as soon/i);
  });
});
