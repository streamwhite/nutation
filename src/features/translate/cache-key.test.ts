import { describe, expect, it } from 'vitest';
import { buildCacheKey, hashText } from '@/features/translate/cache-key';

describe('buildCacheKey', () => {
  it('builds stable keys for short text without async hashing', () => {
    const key = buildCacheKey('Hello world', 'zh-CN', 'gemini-2.5-flash');
    expect(key).toContain('gemini-2.5-flash');
    expect(key).toContain('zh-CN');
    expect(key).toContain('Hello world');
    expect(buildCacheKey('Hello world', 'zh-CN', 'gemini-2.5-flash')).toBe(key);
  });

  it('hashes long text to keep keys bounded', () => {
    const longText = 'a'.repeat(300);
    const key = buildCacheKey(longText, 'zh-CN', 'gemini-2.5-flash');
    expect(key).not.toContain(longText);
    expect(key).toContain(hashText(longText));
  });
});
