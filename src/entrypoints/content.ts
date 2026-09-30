import { PageTranslator } from '@/features/translate/page-translator';
import { summarizeCurrentPage } from '@/features/summarize/page-summarize';
import { buildTranslatedPageInfo } from '@/features/copy-page/copy-page';
import { bindTranslateOnOpen } from '@/features/translate-on-open/auto-start';
import type {
  ContentScriptMessage,
  CopyPageInfoResponse,
} from '@/features/translate/types';
import { MESSAGE_TYPES } from '@/shared/constants';
import { loadSettings } from '@/shared/settings';
import { detectLocale, formatMessage } from '@/i18n';

const translator = new PageTranslator();

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  allFrames: true,
  matchAboutBlank: true,
  main() {
    browser.runtime.onMessage.addListener((message: ContentScriptMessage) => {
      if (message.type === MESSAGE_TYPES.START_TRANSLATE) {
        return loadSettings().then((settings) => {
          const targetLang = message.targetLang || settings.targetLang;
          return translator.start(targetLang, settings);
        }).catch((error: unknown) => ({
          active: false,
          error: error instanceof Error ? error.message : String(error),
          translatedCount: 0,
          cacheHits: 0,
          cacheLookups: 0,
        }));
      }

      if (message.type === MESSAGE_TYPES.STOP_TRANSLATE) {
        return Promise.resolve(translator.stop());
      }

      if (message.type === MESSAGE_TYPES.GET_TAB_STATUS) {
        return Promise.resolve(translator.getStatus());
      }

      if (message.type === MESSAGE_TYPES.SUMMARIZE_PAGE) {
        if (window !== window.top) {
          return Promise.resolve({
            ok: false,
            error: formatMessage(detectLocale(), 'summarize.topFrameOnly'),
          });
        }
        return loadSettings().then((settings) => summarizeCurrentPage(settings));
      }

      if (message.type === MESSAGE_TYPES.COPY_PAGE_INFO) {
        if (window !== window.top) {
          return Promise.resolve({
            ok: false,
            error: formatMessage(detectLocale(), 'copy.topFrameOnly'),
          });
        }
        return loadSettings()
          .then((settings) => buildTranslatedPageInfo(
            settings,
            message.targetLang || settings.targetLang,
          ))
          .then((text): CopyPageInfoResponse => ({ ok: true, text }))
          .catch((error: unknown): CopyPageInfoResponse => ({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }));
      }

      return undefined;
    });

    if (window === window.top) {
      bindTranslateOnOpen(translator);
    }
  },
});
