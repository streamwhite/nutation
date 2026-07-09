import 'bootstrap/dist/css/bootstrap.min.css';
import { isConnectionError } from '@/features/content-script/recover';
import {
  mergeTabStatuses,
  sendMessageToAllFrames,
} from '@/features/content-script/frame-messaging';
import { formatStatusWithTiming } from '@/features/translate/page-translator';
import { MESSAGE_TYPES, POPUP_STATUS_POLL_MS } from '@/shared/constants';
import { loadSettings, saveSettings } from '@/shared/settings';
import type {
  ContentScriptMessage,
  EnsureContentScriptResponse,
  TabStatus,
} from '@/features/translate/types';

const targetLangInput = document.querySelector<HTMLInputElement>('#target-lang')!;
const startBtn = document.querySelector<HTMLButtonElement>('#start-btn')!;
const stopBtn = document.querySelector<HTMLButtonElement>('#stop-btn')!;
const statusEl = document.querySelector<HTMLElement>('#status')!;
const timingEl = document.querySelector<HTMLElement>('#timing')!;
const errorEl = document.querySelector<HTMLElement>('#error')!;
const openOptions = document.querySelector<HTMLAnchorElement>('#open-options')!;

let statusPollTimer: ReturnType<typeof setInterval> | null = null;

function setError(message: string | null): void {
  if (!message) {
    errorEl.classList.add('d-none');
    errorEl.textContent = '';
    return;
  }
  errorEl.classList.remove('d-none');
  errorEl.textContent = message;
}

function renderStatus(status: TabStatus): void {
  statusEl.textContent = formatStatusWithTiming(status);
    if (timingEl) {
      timingEl.textContent = status.timing
        ? Object.entries(status.timing.stages)
          .map(([name, stats]) => `${name} ${stats.totalMs}ms (${stats.count}x, max ${stats.maxMs}ms)`)
          .join(' · ')
        : '';
    }
  setError(status.error);

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

async function getActiveTabId(): Promise<number> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (typeof tabId !== 'number') {
    throw new Error('No active tab found');
  }
  return tabId;
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

async function sendToActiveTab<T>(message: ContentScriptMessage): Promise<T> {
  const tabId = await getActiveTabId();
  const settings = await loadSettings();

  try {
    const results = await sendMessageToAllFrames<T>(tabId, message);
    if (message.type === MESSAGE_TYPES.GET_TAB_STATUS
      || message.type === MESSAGE_TYPES.START_TRANSLATE
      || message.type === MESSAGE_TYPES.STOP_TRANSLATE) {
      return mergeTabStatuses(results as TabStatus[]) as T;
    }
    return results[0] as T;
  } catch (error) {
    if (!settings.autoRecoverContentScript || !isConnectionError(error)) {
      throw formatContentScriptError(error);
    }

    statusEl.textContent = 'Recovering content script…';
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
    const status = await sendToActiveTab<TabStatus>({
      type: MESSAGE_TYPES.GET_TAB_STATUS,
    });
    renderStatus(status);
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error));
    stopStatusPolling();
  }
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  targetLangInput.value = settings.targetLang;
  await refreshStatus();
}

startBtn.addEventListener('click', async () => {
  try {
    setError(null);
    const targetLang = targetLangInput.value.trim();
    if (!targetLang) {
      throw new Error('Target language is required');
    }

    const settings = await loadSettings();
    await saveSettings({ ...settings, targetLang });

    statusEl.textContent = 'Starting…';
    const status = await sendToActiveTab<TabStatus>({
      type: MESSAGE_TYPES.START_TRANSLATE,
      targetLang,
      concurrency: settings.concurrency,
    });
    renderStatus(status);
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error));
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    setError(null);
    const status = await sendToActiveTab<TabStatus>({
      type: MESSAGE_TYPES.STOP_TRANSLATE,
    });
    renderStatus(status);
  } catch (error) {
    setError(error instanceof Error ? error.message : String(error));
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
