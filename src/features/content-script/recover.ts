import { browser } from 'wxt/browser';
import {
  CONTENT_SCRIPT_FILE,
  CONTENT_SCRIPT_INJECT_WARMUP_MS,
  CONTENT_SCRIPT_PING_ATTEMPTS,
  CONTENT_SCRIPT_PING_INTERVAL_MS,
  CONTENT_SCRIPT_REGISTRATION_ID,
  CONTENT_SCRIPT_RETRY_DELAY_MS,
  MESSAGE_TYPES,
  TAB_RELOAD_TIMEOUT_MS,
} from '@/shared/constants';
import { getContentScriptFiles } from '@/features/content-script/manifest-scripts';

const RESTRICTED_URL_PATTERN = /^(chrome|chrome-extension|edge|about|devtools|view-source|moz-extension):/i;
const CONNECTION_ERROR_PATTERN = /receiving end does not exist|could not establish connection|no content script frames responded/i;
const DUPLICATE_SCRIPT_PATTERN = /duplicate script id/i;
const RESTRICTED_PAGE_MESSAGE = 'This page cannot be translated (browser internal page). Open a normal website tab.';

let registerPromise: Promise<void> | null = null;

export function isConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CONNECTION_ERROR_PATTERN.test(message);
}

export function isDuplicateScriptError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return DUPLICATE_SCRIPT_PATTERN.test(message);
}

export function isRestrictedUrl(url: string): boolean {
  return RESTRICTED_URL_PATTERN.test(url);
}

export function getRestrictedPageMessage(): string {
  return RESTRICTED_PAGE_MESSAGE;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingContentScript(tabId: number): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.GET_TAB_STATUS });
    return true;
  } catch {
    return false;
  }
}

async function waitForContentScript(
  tabId: number,
  warmupMs = 0,
): Promise<boolean> {
  if (warmupMs > 0) {
    await delay(warmupMs);
  }

  for (let attempt = 0; attempt < CONTENT_SCRIPT_PING_ATTEMPTS; attempt += 1) {
    if (await pingContentScript(tabId)) {
      return true;
    }
    await delay(CONTENT_SCRIPT_PING_INTERVAL_MS);
  }
  return false;
}

async function injectContentScript(tabId: number): Promise<void> {
  const files = getContentScriptFiles();
  await browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: files as never,
  });
}

async function reloadTab(tabId: number): Promise<void> {
  await browser.tabs.reload(tabId);
  await waitForTabLoad(tabId);
}

async function waitForTabLoad(tabId: number): Promise<void> {
  const tab = await browser.tabs.get(tabId);
  if (tab.status === 'complete') {
    await delay(CONTENT_SCRIPT_RETRY_DELAY_MS);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab reload timed out'));
    }, TAB_RELOAD_TIMEOUT_MS);

    const listener = (updatedTabId: number, info: { status?: string }) => {
      if (updatedTabId !== tabId || info.status !== 'complete') {
        return;
      }
      clearTimeout(timeout);
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    };

    browser.tabs.onUpdated.addListener(listener);
  });

  await delay(CONTENT_SCRIPT_RETRY_DELAY_MS);
}

export type RecoverContentScriptResult = {
  ok: boolean;
  recovered: boolean;
  method?: 'inject' | 'reload' | 'none';
  error?: string;
};

async function hasRegisteredContentScript(): Promise<boolean> {
  const registered = await browser.scripting.getRegisteredContentScripts({
    ids: [CONTENT_SCRIPT_REGISTRATION_ID],
  });
  return registered.length > 0;
}

async function registerContentScript(): Promise<void> {
  if (await hasRegisteredContentScript()) {
    return;
  }

  try {
    await browser.scripting.registerContentScripts([{
      id: CONTENT_SCRIPT_REGISTRATION_ID,
      js: [CONTENT_SCRIPT_FILE],
      matches: ['<all_urls>'],
      runAt: 'document_idle',
      allFrames: true,
    }]);
  } catch (error) {
    if (isDuplicateScriptError(error) || await hasRegisteredContentScript()) {
      return;
    }
    throw error;
  }
}

export async function registerContentScriptIfNeeded(): Promise<void> {
  const manifest = browser.runtime.getManifest();
  if ((manifest.content_scripts ?? []).length > 0) {
    return;
  }

  if (!registerPromise) {
    registerPromise = registerContentScript().finally(() => {
      registerPromise = null;
    });
  }

  await registerPromise;
}

export async function recoverContentScript(tabId: number): Promise<RecoverContentScriptResult> {
  await registerContentScriptIfNeeded().catch((error: unknown) => {
    console.error('Failed to register content script before recovery', error);
  });

  const tab = await browser.tabs.get(tabId);
  const url = tab.url ?? '';
  if (!url || isRestrictedUrl(url)) {
    return {
      ok: false,
      recovered: false,
      error: getRestrictedPageMessage(),
    };
  }

  if (await waitForContentScript(tabId)) {
    return { ok: true, recovered: false, method: 'none' };
  }

  try {
    await injectContentScript(tabId);
    if (await waitForContentScript(tabId, CONTENT_SCRIPT_INJECT_WARMUP_MS)) {
      return { ok: true, recovered: true, method: 'inject' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Content script inject failed', message);
  }

  try {
    await reloadTab(tabId);
    if (await waitForContentScript(tabId, CONTENT_SCRIPT_INJECT_WARMUP_MS)) {
      return { ok: true, recovered: true, method: 'reload' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, recovered: false, error: message };
  }

  return {
    ok: false,
    recovered: false,
    error: 'Content script is still unavailable after recovery attempts. Reload the extension, refresh the page, and try again.',
  };
}
