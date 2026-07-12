import { sendMessageToAllFrames } from '@/features/content-script/frame-messaging';
import { recoverContentScript } from '@/features/content-script/recover';
import {
  CONTEXT_MENU_TRANSLATE_ID,
  CONTEXT_MENU_TRANSLATE_TITLE,
  MESSAGE_TYPES,
} from '@/shared/constants';
import { loadSettings } from '@/shared/settings';

const CONTEXT_MENU_CONTEXTS = [
  'page',
  'selection',
  'editable',
  'frame',
  'link',
  'image',
  'video',
  'audio',
] as const;

export function registerTranslateContextMenu(): void {
  browser.contextMenus.removeAll().then(() => {
    // Single top-level item (not nested under the extension name) so it appears
    // as an early action in the page context menu.
    browser.contextMenus.create({
      id: CONTEXT_MENU_TRANSLATE_ID,
      title: CONTEXT_MENU_TRANSLATE_TITLE,
      contexts: [...CONTEXT_MENU_CONTEXTS],
    });
  }).catch((error: unknown) => {
    console.error('Failed to register translate context menu', error);
  });
}

export async function startTranslateForTab(tabId: number): Promise<void> {
  const settings = await loadSettings();
  const message = {
    type: MESSAGE_TYPES.START_TRANSLATE,
    targetLang: settings.targetLang,
  };

  try {
    await sendMessageToAllFrames(tabId, message);
  } catch {
    const recovered = await recoverContentScript(tabId);
    if (!recovered.ok) {
      throw new Error(recovered.error || 'Content script unavailable');
    }
    await sendMessageToAllFrames(tabId, message);
  }
}

export function bindTranslateContextMenu(): void {
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_TRANSLATE_ID) {
      return;
    }
    const tabId = tab?.id;
    if (typeof tabId !== 'number') {
      return;
    }
    void startTranslateForTab(tabId).catch((error: unknown) => {
      console.error('Context menu translate failed', error);
    });
  });
}
