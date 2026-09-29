import OpenCCCn2t from 'opencc-js/cn2t';
import OpenCCT2cn from 'opencc-js/t2cn';
import {
  isSimplifiedChineseTarget,
  isTraditionalChineseLang,
} from '@/features/opencc/locale';
import type { TextChunk } from '@/features/translate/types';
import {
  OPENCC_CACHE_MODEL_S2T,
  OPENCC_CACHE_MODEL_S2T_HK,
  OPENCC_CACHE_MODEL_T2S,
  OPENCC_S2T_FROM,
  OPENCC_S2T_HK_TO,
  OPENCC_S2T_TO,
  OPENCC_T2S_FROM,
  OPENCC_T2S_TO,
} from '@/shared/constants';

export type OpenCCDirection = 't2s' | 's2t' | 's2t-hk';

type ConverterFn = (text: string) => string;

const converters = new Map<OpenCCDirection, ConverterFn>();

function resolveLocale(envValue: string | undefined, fallback: string): string {
  const value = envValue?.trim();
  return value || fallback;
}

function normalizeLangTag(lang: string): string {
  return lang.trim().toLowerCase().replace(/_/g, '-');
}

function isHongKongOrMacauTarget(targetLang: string): boolean {
  const parts = normalizeLangTag(targetLang).split('-').filter(Boolean);
  return parts.includes('hk') || parts.includes('mo');
}

export function resolveOpenCCDirection(targetLang: string): OpenCCDirection | null {
  if (isSimplifiedChineseTarget(targetLang)) {
    return 't2s';
  }
  if (!isTraditionalChineseLang(targetLang)) {
    return null;
  }
  return isHongKongOrMacauTarget(targetLang) ? 's2t-hk' : 's2t';
}

function createConverter(direction: OpenCCDirection): ConverterFn {
  if (direction === 't2s') {
    return OpenCCT2cn.Converter({
      from: resolveLocale(import.meta.env.VITE_OPENCC_T2S_FROM, OPENCC_T2S_FROM),
      to: resolveLocale(import.meta.env.VITE_OPENCC_T2S_TO, OPENCC_T2S_TO),
    });
  }

  const from = resolveLocale(import.meta.env.VITE_OPENCC_S2T_FROM, OPENCC_S2T_FROM);
  if (direction === 's2t-hk') {
    return OpenCCCn2t.Converter({
      from,
      to: resolveLocale(import.meta.env.VITE_OPENCC_S2T_HK_TO, OPENCC_S2T_HK_TO),
    });
  }

  return OpenCCCn2t.Converter({
    from,
    to: resolveLocale(import.meta.env.VITE_OPENCC_S2T_TO, OPENCC_S2T_TO),
  });
}

function getConverter(direction: OpenCCDirection): ConverterFn {
  const cached = converters.get(direction);
  if (cached) {
    return cached;
  }
  const converter = createConverter(direction);
  converters.set(direction, converter);
  return converter;
}

export function getOpenCCCacheModel(targetLang: string): string {
  const direction = resolveOpenCCDirection(targetLang);
  if (direction === 's2t-hk') {
    return OPENCC_CACHE_MODEL_S2T_HK;
  }
  if (direction === 's2t') {
    return OPENCC_CACHE_MODEL_S2T;
  }
  return OPENCC_CACHE_MODEL_T2S;
}

export function convertChineseScript(text: string, targetLang: string): string {
  const direction = resolveOpenCCDirection(targetLang);
  if (!direction) {
    return text;
  }
  return getConverter(direction)(text);
}

export function convertBatchWithOpenCC(
  texts: TextChunk[],
  targetLang: string,
): TextChunk[] {
  return texts.map((item) => ({
    id: item.id,
    text: convertChineseScript(item.text, targetLang),
  }));
}
