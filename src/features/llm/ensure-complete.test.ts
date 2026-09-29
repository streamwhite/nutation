import { describe, expect, it, vi } from 'vitest';
import { ensureCompleteTranslations } from '@/features/llm/ensure-complete';

describe('ensureCompleteTranslations', () => {
  it('retries missing and truncated items', async () => {
    const longSource = 'I had it myself as a player at Euro 96 when we beat the Netherlands 4-1 at Wembley and felt unstoppable.';
    const translate = vi.fn(async (batch: Array<{ id: string; text: string }>) => {
      if (batch.length === 3) {
        return [
          { id: '0', text: '你好世界' },
          { id: '1', text: '当时我们在温布' },
        ];
      }
      return batch.map((item) => {
        if (item.id === '1') {
          return { id: '1', text: '我在欧洲杯96年以球员身份亲历过，当时我们在温布利4比1击败荷兰，感觉势不可挡。' };
        }
        if (item.id === '2') {
          return { id: '2', text: '另一句应当被完整翻译的句子。' };
        }
        return { id: item.id, text: `译:${item.text}` };
      });
    });

    const result = await ensureCompleteTranslations(
      [
        { id: '0', text: 'Hello world' },
        { id: '1', text: longSource },
        { id: '2', text: 'Another sentence that should be translated fully.' },
      ],
      translate,
    );

    expect(result).toEqual([
      { id: '0', text: '你好世界' },
      { id: '1', text: '我在欧洲杯96年以球员身份亲历过，当时我们在温布利4比1击败荷兰，感觉势不可挡。' },
      { id: '2', text: '另一句应当被完整翻译的句子。' },
    ]);
    expect(translate).toHaveBeenCalledTimes(2);
    expect(translate.mock.calls[1][0].map((item) => item.id)).toEqual(['1', '2']);
  });

  it('uses follow-up packs instead of repeating the full batch when all incomplete', async () => {
    const sources = Array.from({ length: 8 }, (_, index) => ({
      id: String(index),
      text: `headline ${index}`,
    }));
    const translate = vi.fn(async (batch: Array<{ id: string; text: string }>) => {
      if (batch.length === sources.length) {
        return [{ id: '999', text: 'wrong id' }];
      }
      return batch.map((item) => ({ id: item.id, text: `译:${item.text}` }));
    });

    const result = await ensureCompleteTranslations(sources, translate);
    expect(result).toHaveLength(8);
    expect(translate.mock.calls[0][0]).toHaveLength(8);
    expect(translate.mock.calls.slice(1).every((call) => call[0].length <= 6)).toBe(true);
  });

  it('returns partial translations instead of throwing when some items succeed', async () => {
    const translate = vi.fn(async (batch: Array<{ id: string; text: string }>) => {
      if (batch.length > 1) {
        return [{ id: '0', text: '你好' }];
      }
      return [];
    });

    const result = await ensureCompleteTranslations(
      [
        { id: '0', text: 'Hello' },
        { id: '1', text: 'World' },
      ],
      translate,
    );

    expect(result).toEqual([{ id: '0', text: '你好' }]);
  });

  it('retries when the first pass returns no parsed items', async () => {
    const translate = vi.fn(async (batch: Array<{ id: string; text: string }>) => {
      if (translate.mock.calls.length === 1) {
        return [];
      }
      return batch.map((item) => ({ id: item.id, text: `译:${item.text}` }));
    });

    const result = await ensureCompleteTranslations(
      [{ id: '14', text: 'Meta denies using AI to terminate workers.' }],
      translate,
    );

    expect(result).toEqual([{ id: '14', text: '译:Meta denies using AI to terminate workers.' }]);
    expect(translate).toHaveBeenCalledTimes(2);
  });
});
