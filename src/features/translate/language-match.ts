import {
  isSimplifiedChineseTarget,
  isTraditionalChineseLang,
} from '@/features/opencc/locale';

function normalizeLangTag(lang: string): string {
  return lang.trim().toLowerCase().replace(/_/g, '-');
}

function primarySubtag(lang: string): string {
  return normalizeLangTag(lang).split('-').filter(Boolean)[0] ?? '';
}

function isChineseLang(lang: string): boolean {
  return primarySubtag(lang) === 'zh';
}

export function isSameTranslationLanguage(pageLang: string, targetLang: string): boolean {
  const page = normalizeLangTag(pageLang);
  const target = normalizeLangTag(targetLang);
  if (!page || !target) {
    return false;
  }

  if (isChineseLang(page) || isChineseLang(target)) {
    if (!isChineseLang(page) || !isChineseLang(target)) {
      return false;
    }
    if (isSimplifiedChineseTarget(page) && isSimplifiedChineseTarget(target)) {
      return true;
    }
    if (isTraditionalChineseLang(page) && isTraditionalChineseLang(target)) {
      return true;
    }
    return false;
  }

  return primarySubtag(page) === primarySubtag(target);
}
