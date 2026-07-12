import { describe, expect, it } from 'vitest';
import {
  findIncompleteTranslationIds,
  isLikelyTruncatedTranslation,
  mergeTranslations,
} from '@/features/llm/translation-complete';

describe('isLikelyTruncatedTranslation', () => {
  it('flags short translations of long source text', () => {
    const source = 'I had it myself as a player at Euro 96 when we beat the Netherlands 4-1 at Wembley and felt unstoppable.';
    expect(isLikelyTruncatedTranslation(source, '当时我们在温布')).toBe(true);
  });

  it('accepts complete short translations', () => {
    expect(isLikelyTruncatedTranslation('Hello world', '你好世界')).toBe(false);
  });
});

describe('findIncompleteTranslationIds', () => {
  it('returns missing and truncated ids', () => {
    const source = [
      { id: '0', text: 'Hello world' },
      { id: '1', text: 'I had it myself as a player at Euro 96 when we beat the Netherlands 4-1 at Wembley and felt unstoppable.' },
      { id: '2', text: 'Another sentence that should be translated fully.' },
    ];
    const translations = [
      { id: '0', text: '你好世界' },
      { id: '1', text: '当时我们在温布' },
    ];

    expect(findIncompleteTranslationIds(source, translations)).toEqual(['1', '2']);
  });
});

describe('mergeTranslations', () => {
  it('prefers later complete values by id', () => {
    expect(mergeTranslations(
      [{ id: '0', text: 'Hello' }, { id: '1', text: 'World' }],
      [
        [{ id: '0', text: '你好' }, { id: '1', text: '世' }],
        [{ id: '1', text: '世界' }],
      ],
    )).toEqual([
      { id: '0', text: '你好' },
      { id: '1', text: '世界' },
    ]);
  });
});
