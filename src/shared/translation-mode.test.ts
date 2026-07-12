import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRANSLATION_MODE,
  isTranslationMode,
  resolveTranslationMode,
  TRANSLATION_MODE_NOTES,
} from '@/shared/translation-mode';

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

describe('TRANSLATION_MODE_NOTES', () => {
  it('explains tradeoffs for both modes', () => {
    expect(TRANSLATION_MODE_NOTES.bulk).toMatch(/whole page/i);
    expect(TRANSLATION_MODE_NOTES.bulk).toMatch(/scroll/i);
    expect(TRANSLATION_MODE_NOTES.progressive).toMatch(/viewport/i);
    expect(TRANSLATION_MODE_NOTES.progressive).toMatch(/sooner|as soon/i);
  });
});
