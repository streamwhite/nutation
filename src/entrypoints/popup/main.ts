import 'bootstrap/dist/css/bootstrap.min.css';
import {
  getRestrictedPageMessage,
  isConnectionError,
  isRestrictedUrl,
} from '@/features/content-script/recover';
import {
  mergeTabStatuses,
  sendMessageToAllFrames,
} from '@/features/content-script/frame-messaging';
import { formatStatusText } from '@/features/translate/page-translator';
import { MESSAGE_TYPES, POPUP_STATUS_POLL_MS } from '@/shared/constants';
import { API_KEY_MISSING_MESSAGE, hasApiKey } from '@/shared/api-key';
import { loadSettings, type ExtensionSettings } from '@/shared/settings';
import type {
  ContentScriptMessage,
  EnsureContentScriptResponse,
  TabStatus,
} from '@/features/translate/types';

const startBtn = document.querySelector<HTMLButtonElement>('#start-btn')!;
const stopBtn = document.querySelector<HTMLButtonElement>('#stop-btn')!;
const reloadBtn = document.querySelector<HTMLButtonElement>('#reload-btn')!;
const statusEl = document.querySelector<HTMLElement>('#status')!;
const errorEl = document.querySelector<HTMLElement>('#error')!;
const openOptions = document.querySelector<HTMLAnchorElement>('#open-options')!;

let statusPollTimer: ReturnType<typeof setInterval> | null = null;
let pendingReloadTabId: number | null = null;

function setError(message: string | null): void {
  if (!message) {
    errorEl.classList.add('d-none');
    errorEl.textContent = '';
    return;
  }
  errorEl.classList.remove('d-none');
  errorEl.textContent = message;
}

function setReloadAction(tabId: number | null): void {
  pendingReloadTabId = tabId;
  if (tabId === null) {
    reloadBtn.classList.add('d-none');
    return;
  }
  reloadBtn.classList.remove('d-none');
}

function renderStatus(status: TabStatus): void {
  statusEl.textContent = formatStatusText(status);
  setError(status.error);
  setReloadAction(null);

  if (status.active) {
    startStatusPolling();
  } else {
    stopStatusPolling();
  }
}

function startStatusPolling(): void {
  if (statusPollTimer) {
    return;
  }
  statusPollTimer = setInterval(() => {
    void refreshStatus();
  }, POPUP_STATUS_POLL_MS);
}

function stopStatusPolling(): void {
  if (!statusPollTimer) {
    return;
  }
  clearInterval(statusPollTimer);
  statusPollTimer = null;
}

async function getActiveTab(): Promise<{ id: number; url: string }> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (typeof tab?.id !== 'number') {
    throw new Error('No active tab found');
  }
  return { id: tab.id, url: tab.url ?? '' };
}

function formatContentScriptError(error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`Content script unavailable. Reload the page and try again. (${detail})`);
}

async function recoverContentScript(tabId: number): Promise<EnsureContentScriptResponse> {
  return browser.runtime.sendMessage({
    type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT,
    tabId,
  }) as Promise<EnsureContentScriptResponse>;
}

async function sendToTab<T>(
  tabId: number,
  message: ContentScriptMessage,
  autoRecover: boolean,
): Promise<T> {
  try {
    const results = await sendMessageToAllFrames<T>(tabId, message);
    if (message.type === MESSAGE_TYPES.GET_TAB_STATUS
      || message.type === MESSAGE_TYPES.START_TRANSLATE
      || message.type === MESSAGE_TYPES.STOP_TRANSLATE) {
      return mergeTabStatuses(results as TabStatus[]) as T;
    }
    return results[0] as T;
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }

    if (!autoRecover) {
      throw formatContentScriptError(error);
    }

    statusEl.textContent = 'Recovering content script…';
    setReloadAction(null);
    const recovered = await recoverContentScript(tabId);
    if (!recovered.ok) {
      throw new Error(recovered.error ?? 'Failed to recover content script');
    }

    if (recovered.recovered && recovered.method === 'reload') {
      statusEl.textContent = 'Page reloaded. Retrying…';
    }

    try {
      const results = await sendMessageToAllFrames<T>(tabId, message);
      if (message.type === MESSAGE_TYPES.GET_TAB_STATUS
        || message.type === MESSAGE_TYPES.START_TRANSLATE
        || message.type === MESSAGE_TYPES.STOP_TRANSLATE) {
        return mergeTabStatuses(results as TabStatus[]) as T;
      }
      return results[0] as T;
    } catch (retryError) {
      throw formatContentScriptError(retryError);
    }
  }
}

async function refreshStatus(): Promise<void> {
  try {
    const tab = await getActiveTab();
    if (isRestrictedUrl(tab.url)) {
      statusEl.textContent = 'Open a website tab to translate';
      setError(null);
      setReloadAction(null);
      stopStatusPolling();
      return;
    }

    const settings = await loadSettings();
    const status = await sendToTab<TabStatus>(
      tab.id,
      { type: MESSAGE_TYPES.GET_TAB_STATUS },
      settings.autoRecoverContentScript,
    );
    renderStatus(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cannot be translated/i.test(message)) {
      statusEl.textContent = 'Open a website tab to translate';
      setError(null);
      setReloadAction(null);
    } else if (isConnectionError(error) || /content script unavailable/i.test(message)) {
      const settings = await loadSettings().catch(() => null);
      setError(message);
      if (settings && !settings.autoRecoverContentScript) {
        const tab = await getActiveTab().catch(() => null);
        setReloadAction(tab?.id ?? null);
      } else {
        setReloadAction(null);
      }
    } else {
      setError(message);
      setReloadAction(null);
    }
    stopStatusPolling();
  }
}

function setTranslateEnabled(enabled: boolean): void {
  startBtn.disabled = !enabled;
}

function requireApiKey(settings: ExtensionSettings): boolean {
  if (hasApiKey(settings)) {
    setTranslateEnabled(true);
    return true;
  }
  setTranslateEnabled(false);
  setError(API_KEY_MISSING_MESSAGE);
  setReloadAction(null);
  statusEl.textContent = 'Idle';
  stopStatusPolling();
  return false;
}

function warmProvider(settings: ExtensionSettings): void {
  void browser.runtime.sendMessage({
    type: MESSAGE_TYPES.WARM_PROVIDER,
    settings,
  }).catch(() => undefined);
}

async function startTranslate(): Promise<void> {
  setError(null);
  setReloadAction(null);

  const settings = await loadSettings();
  if (!requireApiKey(settings)) {
    return;
  }

  const tab = await getActiveTab();
  if (isRestrictedUrl(tab.url)) {
    statusEl.textContent = 'Idle';
    setError(getRestrictedPageMessage());
    return;
  }

  warmProvider(settings);

  statusEl.textContent = 'Starting…';
  try {
    const status = await sendToTab<TabStatus>(
      tab.id,
      {
        type: MESSAGE_TYPES.START_TRANSLATE,
        targetLang: settings.targetLang,
      },
      settings.autoRecoverContentScript,
    );
    renderStatus(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cannot be translated/i.test(message)) {
      setError(message);
      setReloadAction(null);
      return;
    }
    setError(message);
    if (!settings.autoRecoverContentScript && (
      isConnectionError(error) || /content script unavailable/i.test(message)
    )) {
      setReloadAction(tab.id);
    }
  }
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  if (!requireApiKey(settings)) {
    return;
  }
  warmProvider(settings);
  await refreshStatus();
}

startBtn.addEventListener('click', () => {
  void startTranslate();
});

stopBtn.addEventListener('click', async () => {
  try {
    setError(null);
    setReloadAction(null);
    const tab = await getActiveTab();
    if (isRestrictedUrl(tab.url)) {
      setError(getRestrictedPageMessage());
      return;
    }
    const settings = await loadSettings();
    const status = await sendToTab<TabStatus>(
      tab.id,
      { type: MESSAGE_TYPES.STOP_TRANSLATE },
      settings.autoRecoverContentScript,
    );
    renderStatus(status);
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error));
    setReloadAction(null);
  }
});

reloadBtn.addEventListener('click', async () => {
  const tabId = pendingReloadTabId;
  if (typeof tabId !== 'number') {
    return;
  }

  reloadBtn.disabled = true;
  setError(null);
  statusEl.textContent = 'Reloading page…';

  try {
    await browser.tabs.reload(tabId);
    statusEl.textContent = 'Page reloaded. Starting…';
    setReloadAction(null);
    await startTranslate();
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error));
    setReloadAction(tabId);
  } finally {
    reloadBtn.disabled = false;
  }
});

openOptions.addEventListener('click', (event) => {
  event.preventDefault();
  void browser.runtime.openOptionsPage();
});

window.addEventListener('unload', () => {
  stopStatusPolling();
});

void init();
