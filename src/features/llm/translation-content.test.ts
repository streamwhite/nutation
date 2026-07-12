import { describe, expect, it } from 'vitest';
import { parseTranslationContent } from '@/features/llm/translation-content';

describe('parseTranslationContent', () => {
  it('parses tab-separated lines', () => {
    expect(parseTranslationContent('0\t你好\n1\t世界')).toEqual([
      { id: '0', text: '你好' },
      { id: '1', text: '世界' },
    ]);
  });

  it('parses fenced line output from thinking models', () => {
    expect(parseTranslationContent('```\n0\t你好\n1\t世界\n```')).toEqual([
      { id: '0', text: '你好' },
      { id: '1', text: '世界' },
    ]);
  });

  it('parses pipe-separated lines with preamble', () => {
    expect(parseTranslationContent('Here are the translations:\n0|你好\n1|世界')).toEqual([
      { id: '0', text: '你好' },
      { id: '1', text: '世界' },
    ]);
  });

  it('parses json arrays', () => {
    expect(parseTranslationContent(JSON.stringify([
      { id: '0', text: '你好' },
    ]))).toEqual([{ id: '0', text: '你好' }]);
  });

  it('parses structured items objects', () => {
    expect(parseTranslationContent(JSON.stringify({
      items: [{ id: '0', text: '你好' }],
    }))).toEqual([{ id: '0', text: '你好' }]);
  });

  it('parses embedded json with numeric ids', () => {
    expect(parseTranslationContent('Sure.\n{"items":[{"id":0,"text":"你好"}]}')).toEqual([
      { id: '0', text: '你好' },
    ]);
  });

  it('includes a preview when parsing fails', () => {
    expect(() => parseTranslationContent('sorry, cannot help')).toThrow(/sorry, cannot help/);
  });

  it('recovers complete items from truncated fenced json', () => {
    const truncated = [
      '```json',
      '{"items":[',
      '{"id":"287","text":"停止外星人笑话"},',
      '{"id":"288","text":"小镇居民感到困惑"},',
      '{"id":"290","text":"哈里·',
    ].join('\n');

    expect(parseTranslationContent(truncated)).toEqual([
      { id: '287', text: '停止外星人笑话' },
      { id: '288', text: '小镇居民感到困惑' },
    ]);
  });

  it('parses json items whose text contains pipe characters', () => {
    const content = [
      '```json',
      '{"items":[',
      '{"id":"61","text":"科技视频"},',
      '{"id":"63","text":"SK海力士在美国创纪录发行后股价上涨 | 收盘 2026年7月10日"},',
      '{"id":"65","text":"住房法案将在没有特朗普签名的情况下成为法律 | Balance of Power"}',
      ']}',
      '```',
    ].join('\n');

    expect(parseTranslationContent(content)).toEqual([
      { id: '61', text: '科技视频' },
      { id: '63', text: 'SK海力士在美国创纪录发行后股价上涨 | 收盘 2026年7月10日' },
      { id: '65', text: '住房法案将在没有特朗普签名的情况下成为法律 | Balance of Power' },
    ]);
  });
});
