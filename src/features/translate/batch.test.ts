import { describe, expect, it } from 'vitest';
import {
  applyTranslations,
  chunkArray,
  createIdMap,
  dedupeTextChunks,
  expandTranslations,
  packBatchesByBudget,
  shouldTranslateText,
  splitFastFirstBatch,
} from '@/features/translate/batch';

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

describe('shouldTranslateText', () => {
  it('skips short, numeric, punctuation, urls, and dates', () => {
    expect(shouldTranslateText('a', 2)).toBe(false);
    expect(shouldTranslateText('42', 2)).toBe(false);
    expect(shouldTranslateText('!!!', 2)).toBe(false);
    expect(shouldTranslateText('https://example.com/x', 2)).toBe(false);
    expect(shouldTranslateText('Jan 1, 2025', 2)).toBe(false);
    expect(shouldTranslateText('Hello world', 2)).toBe(true);
  });
});

describe('dedupeTextChunks', () => {
  it('collapses duplicate texts and expands translations', () => {
    const { unique, expand } = dedupeTextChunks([
      { id: '0', text: 'Hello' },
      { id: '1', text: 'Hello' },
      { id: '2', text: 'World' },
    ]);

    expect(unique).toEqual([
      { id: '0', text: 'Hello' },
      { id: '2', text: 'World' },
    ]);
    expect(expand.get('0')).toEqual(['0', '1']);

    const expanded = expandTranslations(
      [
        { id: '0', text: '你好' },
        { id: '2', text: '世界' },
      ],
      expand,
    );
    expect(expanded).toEqual([
      { id: '0', text: '你好' },
      { id: '1', text: '你好' },
      { id: '2', text: '世界' },
    ]);
  });
});

describe('splitFastFirstBatch', () => {
  it('takes a small first batch for faster visible translation', () => {
    const chunks = Array.from({ length: 20 }, (_, index) => ({
      id: String(index),
      text: `line ${index}`,
    }));

    const { fast, rest } = splitFastFirstBatch(chunks, 5, 40);
    expect(fast).toHaveLength(5);
    expect(rest).toHaveLength(15);
    expect(fast[0]?.id).toBe('0');
  });
});

describe('packBatchesByBudget', () => {
  it('packs by item and character budget', () => {
    const chunks = [
      { id: '0', text: 'aaaa' },
      { id: '1', text: 'bbbb' },
      { id: '2', text: 'cccc' },
      { id: '3', text: 'dddd' },
    ];

    expect(packBatchesByBudget(chunks, 10, 8)).toEqual([
      [
        { id: '0', text: 'aaaa' },
        { id: '1', text: 'bbbb' },
      ],
      [
        { id: '2', text: 'cccc' },
        { id: '3', text: 'dddd' },
      ],
    ]);

    expect(packBatchesByBudget(chunks, 2, 10_000)).toEqual([
      [
        { id: '0', text: 'aaaa' },
        { id: '1', text: 'bbbb' },
      ],
      [
        { id: '2', text: 'cccc' },
        { id: '3', text: 'dddd' },
      ],
    ]);
  });
});
