import OpenCC from 'opencc-js/t2cn';
import type { TextChunk } from '@/features/translate/types';
import {
  OPENCC_CACHE_MODEL,
  OPENCC_FROM_LOCALE,
  OPENCC_TO_LOCALE,
} from '@/shared/constants';

type ConverterFn = (text: string) => string;

let converter: ConverterFn | null = null;

function resolveLocale(envValue: string | undefined, fallback: string): string {
  const value = envValue?.trim();
  return value || fallback;
}

function getConverter(): ConverterFn {
  if (converter) {
    return converter;
  }
  const from = resolveLocale(import.meta.env.VITE_OPENCC_FROM, OPENCC_FROM_LOCALE);
  const to = resolveLocale(import.meta.env.VITE_OPENCC_TO, OPENCC_TO_LOCALE);
  converter = OpenCC.Converter({ from, to });
  return converter;
}

export function getOpenCCCacheModel(): string {
  return OPENCC_CACHE_MODEL;
}

export function convertTwToCn(text: string): string {
  return getConverter()(text);
}

export function convertBatchWithOpenCC(texts: TextChunk[]): TextChunk[] {
  const convert = getConverter();
  return texts.map((item) => ({
    id: item.id,
    text: convert(item.text),
  }));
}
