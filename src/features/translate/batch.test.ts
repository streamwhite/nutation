import { describe, expect, it } from 'vitest';
import { applyTranslations, chunkArray, createIdMap } from '@/features/translate/batch';

describe('createIdMap', () => {
  it('maps texts to stable index ids', () => {
    expect(createIdMap(['a', 'b'])).toEqual([
      { id: '0', text: 'a' },
      { id: '1', text: 'b' },
    ]);
  });
});

describe('applyTranslations', () => {
  it('maps translations back by id', () => {
    const originals = createIdMap(['hello', 'world']);
    const translations = [
      { id: '1', text: '世界' },
      { id: '0', text: '你好' },
    ];

    const result = applyTranslations(originals, translations);
    expect(result.get('0')).toBe('你好');
    expect(result.get('1')).toBe('世界');
  });

  it('ignores missing translation ids', () => {
    const originals = createIdMap(['only']);
    const result = applyTranslations(originals, []);
    expect(result.size).toBe(0);
  });
});

describe('chunkArray', () => {
  it('splits into fixed-size batches', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
