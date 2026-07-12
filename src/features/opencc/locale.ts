import {
  SIMPLIFIED_CHINESE_LANG_TAGS,
  TRADITIONAL_CHINESE_LANG_TAGS,
} from '@/shared/constants';

function normalizeLangTag(lang: string): string {
  return lang.trim().toLowerCase().replace(/_/g, '-');
}

function langParts(lang: string): string[] {
  return normalizeLangTag(lang).split('-').filter(Boolean);
}

export function isSimplifiedChineseTarget(targetLang: string): boolean {
  const normalized = normalizeLangTag(targetLang);
  if (!normalized.startsWith('zh')) {
    return false;
  }
  if (SIMPLIFIED_CHINESE_LANG_TAGS.includes(
    normalized as typeof SIMPLIFIED_CHINESE_LANG_TAGS[number],
  )) {
    return true;
  }
  const parts = langParts(normalized);
  if (parts.includes('hans')) {
    return true;
  }
  if (parts.includes('hant')) {
    return false;
  }
  return normalized === 'zh' || normalized === 'zh-cn' || normalized.startsWith('zh-cn-');
}

export function isTraditionalChineseLang(lang: string): boolean {
  const normalized = normalizeLangTag(lang);
  if (!normalized.startsWith('zh')) {
    return false;
  }
  if (isSimplifiedChineseTarget(normalized)) {
    return false;
  }
  if (TRADITIONAL_CHINESE_LANG_TAGS.includes(
    normalized as typeof TRADITIONAL_CHINESE_LANG_TAGS[number],
  )) {
    return true;
  }

  const parts = langParts(normalized);
  if (parts.includes('hant')) {
    return true;
  }

  const region = parts[1];
  return region === 'tw' || region === 'hk' || region === 'mo';
}

export function isPrimarilyChineseText(text: string): boolean {
  const hanCount = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  if (hanCount === 0) {
    return false;
  }
  const latinCount = text.match(/[A-Za-z]/g)?.length ?? 0;
  return hanCount >= latinCount;
}

export function shouldUseOpenCC(
  text: string,
  targetLang: string,
  sourceLang?: string,
): boolean {
  if (!isSimplifiedChineseTarget(targetLang) || !isPrimarilyChineseText(text)) {
    return false;
  }
  if (!sourceLang?.trim()) {
    return true;
  }
  return isTraditionalChineseLang(sourceLang)
    || isSimplifiedChineseTarget(sourceLang)
    || !normalizeLangTag(sourceLang).startsWith('zh');
}

export function resolveElementLang(element: Element | null | undefined): string {
  let current: Element | null | undefined = element;
  while (current) {
    const lang = current.getAttribute('lang')?.trim();
    if (lang) {
      return lang;
    }
    current = current.parentElement;
  }

  if (typeof document === 'undefined') {
    return '';
  }
  return document.documentElement.getAttribute('lang')?.trim()
    || document.body?.getAttribute('lang')?.trim()
    || '';
}
