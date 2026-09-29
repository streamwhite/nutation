import { describe, expect, it } from 'vitest';
import {
  matchTranslateOnOpenRule,
  shouldTranslateOnOpen,
  type TranslateOnOpenRule,
} from '@/features/translate-on-open/match';

function rule(
  partial: Partial<TranslateOnOpenRule> & Pick<TranslateOnOpenRule, 'type' | 'pattern'>,
): TranslateOnOpenRule {
  return {
    id: partial.id ?? 'rule-1',
    enabled: partial.enabled ?? true,
    type: partial.type,
    pattern: partial.pattern,
  };
}

describe('matchTranslateOnOpenRule', () => {
  it('matches url prefixes', () => {
    expect(matchTranslateOnOpenRule(
      'https://news.example/world/a',
      rule({ type: 'prefix', pattern: 'https://news.example/world' }),
    )).toBe(true);
    expect(matchTranslateOnOpenRule(
      'https://news.example/sport',
      rule({ type: 'prefix', pattern: 'https://news.example/world' }),
    )).toBe(false);
  });

  it('matches domain and subdomains', () => {
    expect(matchTranslateOnOpenRule(
      'https://docs.example.com/guide',
      rule({ type: 'domain', pattern: 'example.com' }),
    )).toBe(true);
    expect(matchTranslateOnOpenRule(
      'https://example.com/',
      rule({ type: 'domain', pattern: 'https://example.com/path' }),
    )).toBe(true);
    expect(matchTranslateOnOpenRule(
      'https://other.com/',
      rule({ type: 'domain', pattern: 'example.com' }),
    )).toBe(false);
  });

  it('matches regexp patterns and ignores invalid ones', () => {
    expect(matchTranslateOnOpenRule(
      'https://blog.example/post/1',
      rule({ type: 'regexp', pattern: '^https://blog\\.example/post/\\d+$' }),
    )).toBe(true);
    expect(matchTranslateOnOpenRule(
      'https://blog.example/post/1',
      rule({ type: 'regexp', pattern: '(' }),
    )).toBe(false);
  });

  it('skips disabled rules', () => {
    expect(matchTranslateOnOpenRule(
      'https://example.com/',
      rule({ type: 'domain', pattern: 'example.com', enabled: false }),
    )).toBe(false);
  });
});

describe('shouldTranslateOnOpen', () => {
  it('requires autostart enabled and at least one matching rule', () => {
    const rules = [rule({ type: 'domain', pattern: 'example.com' })];
    expect(shouldTranslateOnOpen('https://example.com/', {
      translateOnOpen: true,
      rules,
    })).toBe(true);
    expect(shouldTranslateOnOpen('https://example.com/', {
      translateOnOpen: false,
      rules,
    })).toBe(false);
    expect(shouldTranslateOnOpen('https://other.com/', {
      translateOnOpen: true,
      rules,
    })).toBe(false);
  });
});
