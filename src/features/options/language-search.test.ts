import { describe, expect, it } from 'vitest';
import { searchTargetLanguages } from '@/features/options/language-search';

describe('searchTargetLanguages', () => {
  it('finds languages by name or code', () => {
    expect(searchTargetLanguages('zh-CN')[0]?.code).toBe('zh-CN');
    expect(searchTargetLanguages('Simplified')[0]?.code).toBe('zh-CN');
  });

  it('lists languages when the query is empty', () => {
    expect(searchTargetLanguages('').length).toBeGreaterThan(0);
  });
});
