import { PageTranslator } from '@/features/translate/page-translator';
import type { ExtensionMessage } from '@/features/translate/types';
import { MESSAGE_TYPES } from '@/shared/constants';
import { loadSettings } from '@/shared/settings';

const translator = new PageTranslator();

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === MESSAGE_TYPES.START_TRANSLATE) {
        return loadSettings().then((settings) => {
          const targetLang = message.targetLang || settings.targetLang;
          return translator.start(targetLang, settings.concurrency);
        }).catch((error: unknown) => ({
          active: false,
          error: error instanceof Error ? error.message : String(error),
          translatedCount: 0,
        }));
      }

      if (message.type === MESSAGE_TYPES.STOP_TRANSLATE) {
        return Promise.resolve(translator.stop());
      }

      if (message.type === MESSAGE_TYPES.GET_TAB_STATUS) {
        return Promise.resolve(translator.getStatus());
      }

      return undefined;
    });
  },
});
