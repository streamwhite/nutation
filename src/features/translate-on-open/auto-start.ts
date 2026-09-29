import { isRestrictedUrl } from '@/features/content-script/recover';
import { shouldTranslateOnOpen } from '@/features/translate-on-open/match';
import type { PageTranslator } from '@/features/translate/page-translator';
import { hasApiKey } from '@/shared/api-key';
import { loadSettings } from '@/shared/settings';

const AUTO_TRANSLATE_DEBOUNCE_MS = 200;

export async function maybeAutoTranslateOnOpen(
  translator: PageTranslator,
  getUrl: () => string = () => window.location.href,
): Promise<void> {
  if (translator.getStatus().active) {
    return;
  }

  const url = getUrl();
  if (isRestrictedUrl(url)) {
    return;
  }

  const settings = await loadSettings();
  if (!hasApiKey(settings)) {
    return;
  }
  if (!shouldTranslateOnOpen(url, {
    translateOnOpen: settings.translateOnOpen,
    rules: settings.translateOnOpenRules,
  })) {
    return;
  }

  try {
    await translator.start(settings.targetLang, settings);
  } catch (error) {
    console.error('Translate on open failed', error);
  }
}

export function bindTranslateOnOpen(
  translator: PageTranslator,
  getUrl: () => string = () => window.location.href,
): void {
  let lastUrl = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    const url = getUrl();
    if (url === lastUrl) {
      return;
    }
    lastUrl = url;
    void maybeAutoTranslateOnOpen(translator, getUrl);
  };

  const schedule = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      run();
    }, AUTO_TRANSLATE_DEBOUNCE_MS);
  };

  run();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
}
