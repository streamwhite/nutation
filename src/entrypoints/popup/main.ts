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
import {
  formatMultiTabStartLabel,
  formatRestoreButtonLabel,
  formatSelectedTabsStatus,
  formatTranslateButtonLabel,
  noTranslatableTabsMessage,
  normalizePopupTabs,
  partitionTranslatableTabs,
  summarizeMultiTabResults,
  type MultiTabResult,
  type PopupTab,
} from '@/features/popup/selected-tabs';
import { formatStatusText } from '@/features/translate/page-translator';
import { MESSAGE_TYPES, POPUP_STATUS_POLL_MS } from '@/shared/constants';
import { API_KEY_MISSING_MESSAGE, hasApiKey } from '@/shared/api-key';
import { loadSettings, type ExtensionSettings } from '@/shared/settings';
import { getUiStrings } from '@/shared/ui-strings';
import type {
  ContentScriptMessage,
  CopyPageInfoResponse,
  EnsureContentScriptResponse,
  SummarizePageResponse,
  TabStatus,
} from '@/features/translate/types';

const ui = getUiStrings().popup;
const startBtn = document.querySelector<HTMLButtonElement>('#start-btn')!;
const stopBtn = document.querySelector<HTMLButtonElement>('#stop-btn')!;
const summarizeBtn = document.querySelector<HTMLButtonElement>('#summarize-btn')!;
const copyBtn = document.querySelector<HTMLButtonElement>('#copy-btn')!;
const summarizeNote = document.querySelector<HTMLElement>('#summarize-note')!;
const reloadBtn = document.querySelector<HTMLButtonElement>('#reload-btn')!;
const statusEl = document.querySelector<HTMLElement>('#status')!;
const errorEl = document.querySelector<HTMLElement>('#error')!;
const openOptions = document.querySelector<HTMLAnchorElement>('#open-options')!;
const popupTitle = document.querySelector<HTMLElement>('#popup-title')!;

let statusPollTimer: ReturnType<typeof setInterval> | null = null;
let pendingReloadTabId: number | null = null;
let selectedTabCount = 1;

function applyStaticLabels(): void {
  popupTitle.textContent = ui.title;
  summarizeBtn.textContent = ui.summarizeButton;
  copyBtn.textContent = ui.copyButton;
  summarizeNote.textContent = ui.summarizeNote;
  reloadBtn.textContent = ui.reloadAndTranslate;
  openOptions.textContent = ui.openSettings;
}

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

function updateActionLabels(tabCount: number): void {
  selectedTabCount = Math.max(1, tabCount);
  startBtn.textContent = formatTranslateButtonLabel(selectedTabCount);
  stopBtn.textContent = formatRestoreButtonLabel(selectedTabCount);
}

function renderStatus(status: TabStatus, tabCount = selectedTabCount): void {
  statusEl.textContent = tabCount > 1
    ? formatSelectedTabsStatus(tabCount, status.active)
    : formatStatusText(status);
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

async function getSelectedTabs(): Promise<PopupTab[]> {
  const highlighted = await browser.tabs.query({
    highlighted: true,
    currentWindow: true,
  });
  const selected = normalizePopupTabs(highlighted);
  if (selected.length > 0) {
    return selected;
  }

  const active = await browser.tabs.query({ active: true, currentWindow: true });
  return normalizePopupTabs(active);
}

async function getActiveTab(): Promise<PopupTab> {
  const tabs = await getSelectedTabs();
  const active = tabs.find((tab) => !isRestrictedUrl(tab.url)) ?? tabs[0];
  if (!active) {
    throw new Error('No active tab found');
  }
  return active;
}

function formatContentScriptError(error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`Content script unavailable. Reload the page and try again. (${detail})`);
}

function pickSummarizeResponse(results: SummarizePageResponse[]): SummarizePageResponse {
  return results.find((item) => item.ok) ?? results[0] ?? {
    ok: false,
    error: ui.summarizeTopFrameOnly,
  };
}

function pickCopyResponse(results: CopyPageInfoResponse[]): CopyPageInfoResponse {
  return results.find((item) => item.ok) ?? results[0] ?? {
    ok: false,
    error: ui.copyTopFrameOnly,
  };
}

function resolveTabResults<T>(message: ContentScriptMessage, results: unknown[]): T {
  if (message.type === MESSAGE_TYPES.GET_TAB_STATUS
    || message.type === MESSAGE_TYPES.START_TRANSLATE
    || message.type === MESSAGE_TYPES.STOP_TRANSLATE) {
    return mergeTabStatuses(results as TabStatus[]) as T;
  }
  if (message.type === MESSAGE_TYPES.SUMMARIZE_PAGE) {
    return pickSummarizeResponse(results as SummarizePageResponse[]) as T;
  }
  if (message.type === MESSAGE_TYPES.COPY_PAGE_INFO) {
    return pickCopyResponse(results as CopyPageInfoResponse[]) as T;
  }
  return results[0] as T;
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
    return resolveTabResults<T>(message, results);
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }

    if (!autoRecover) {
      throw formatContentScriptError(error);
    }

    statusEl.textContent = ui.recovering;
    setReloadAction(null);
    const recovered = await recoverContentScript(tabId);
    if (!recovered.ok) {
      throw new Error(recovered.error ?? 'Failed to recover content script');
    }

    if (recovered.recovered && recovered.method === 'reload') {
      statusEl.textContent = ui.pageReloadedRetry;
    }

    try {
      const results = await sendMessageToAllFrames<T>(tabId, message);
      return resolveTabResults<T>(message, results);
    } catch (retryError) {
      throw formatContentScriptError(retryError);
    }
  }
}

async function refreshActionLabels(): Promise<void> {
  const tabs = await getSelectedTabs();
  updateActionLabels(tabs.length);
}

async function refreshStatus(): Promise<void> {
  try {
    const tabs = await getSelectedTabs();
    updateActionLabels(tabs.length);
    const { translatable } = partitionTranslatableTabs(tabs);
    const tab = translatable[0] ?? tabs[0];
    if (!tab || isRestrictedUrl(tab.url)) {
      statusEl.textContent = ui.openWebsiteTab;
      setError(null);
      setReloadAction(null);
      stopStatusPolling();
      return;
    }

    const settings = await loadSettings();
    const statuses = await Promise.all(translatable.map((item) => (
      sendToTab<TabStatus>(
        item.id,
        { type: MESSAGE_TYPES.GET_TAB_STATUS },
        settings.autoRecoverContentScript,
      )
    )));
    const merged = mergeTabStatuses(statuses);
    renderStatus(merged, translatable.length);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cannot be translated/i.test(message)) {
      statusEl.textContent = ui.openWebsiteTab;
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

function setActionsEnabled(enabled: boolean): void {
  startBtn.disabled = !enabled;
  summarizeBtn.disabled = !enabled;
  copyBtn.disabled = !enabled;
}

function requireApiKey(settings: ExtensionSettings): boolean {
  if (hasApiKey(settings)) {
    setActionsEnabled(true);
    return true;
  }
  setActionsEnabled(false);
  setError(API_KEY_MISSING_MESSAGE);
  setReloadAction(null);
  statusEl.textContent = ui.idle;
  stopStatusPolling();
  return false;
}

function warmProvider(settings: ExtensionSettings): void {
  void browser.runtime.sendMessage({
    type: MESSAGE_TYPES.WARM_PROVIDER,
    settings,
  }).catch(() => undefined);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runOnTabs(
  tabs: PopupTab[],
  autoRecover: boolean,
  message: ContentScriptMessage,
): Promise<MultiTabResult[]> {
  return Promise.all(tabs.map(async (tab) => {
    try {
      await sendToTab<TabStatus>(tab.id, message, autoRecover);
      return { ok: true as const, tabId: tab.id };
    } catch (error) {
      return {
        ok: false as const,
        tabId: tab.id,
        error: errorMessage(error),
      };
    }
  }));
}

async function startTranslate(): Promise<void> {
  setError(null);
  setReloadAction(null);

  const settings = await loadSettings();
  if (!requireApiKey(settings)) {
    return;
  }

  const selected = await getSelectedTabs();
  updateActionLabels(selected.length);
  const { translatable, restricted } = partitionTranslatableTabs(selected);
  if (translatable.length === 0) {
    statusEl.textContent = ui.idle;
    setError(noTranslatableTabsMessage(restricted.length));
    return;
  }

  warmProvider(settings);
  statusEl.textContent = formatMultiTabStartLabel(translatable.length);

  const results = await runOnTabs(
    translatable,
    settings.autoRecoverContentScript,
    {
      type: MESSAGE_TYPES.START_TRANSLATE,
      targetLang: settings.targetLang,
    },
  );
  const summary = summarizeMultiTabResults(results);

  if (summary.started > 0) {
    renderStatus({
      active: true,
      error: null,
      translatedCount: 0,
    }, summary.started);
  }

  if (summary.failed > 0) {
    const skipped = restricted.length > 0
      ? ` Skipped ${restricted.length} restricted tab(s).`
      : '';
    const detail = summary.started > 0
      ? `Started ${summary.started}/${translatable.length} tabs. ${summary.firstError}${skipped}`
      : `${summary.firstError}${skipped}`;
    setError(detail);
    if (!settings.autoRecoverContentScript
      && summary.firstFailedTabId !== null
      && summary.started === 0
      && /content script unavailable|receiving end does not exist/i.test(summary.firstError ?? '')) {
      setReloadAction(summary.firstFailedTabId);
    }
    return;
  }

  if (restricted.length > 0) {
    setError(`Skipped ${restricted.length} restricted tab(s).`);
  }
}

async function stopTranslate(): Promise<void> {
  setError(null);
  setReloadAction(null);

  const selected = await getSelectedTabs();
  updateActionLabels(selected.length);
  const { translatable, restricted } = partitionTranslatableTabs(selected);
  if (translatable.length === 0) {
    setError(noTranslatableTabsMessage(restricted.length));
    return;
  }

  const settings = await loadSettings();
  const results = await runOnTabs(
    translatable,
    settings.autoRecoverContentScript,
    { type: MESSAGE_TYPES.STOP_TRANSLATE },
  );
  const summary = summarizeMultiTabResults(results);

  if (summary.started > 0) {
    renderStatus({
      active: false,
      error: null,
      translatedCount: 0,
    }, summary.started);
  }

  if (summary.failed > 0) {
    setError(summary.started > 0
      ? `Restored ${summary.started}/${translatable.length} tabs. ${summary.firstError}`
      : summary.firstError);
  }
}

async function startSummarize(): Promise<void> {
  setError(null);
  setReloadAction(null);

  const settings = await loadSettings();
  if (!requireApiKey(settings)) {
    return;
  }

  const selected = await getSelectedTabs();
  const { translatable, restricted } = partitionTranslatableTabs(selected);
  const tab = translatable[0];
  if (!tab) {
    statusEl.textContent = ui.idle;
    setError(noTranslatableTabsMessage(restricted.length));
    return;
  }

  warmProvider(settings);
  summarizeBtn.disabled = true;
  statusEl.textContent = ui.summarizeStarting;

  try {
    const result = await sendToTab<SummarizePageResponse>(
      tab.id,
      { type: MESSAGE_TYPES.SUMMARIZE_PAGE, targetLang: settings.targetLang },
      settings.autoRecoverContentScript,
    );
    if (!result.ok) {
      setError(result.error);
      statusEl.textContent = ui.idle;
      return;
    }
    statusEl.textContent = result.fromCache
      ? ui.summarizeDoneFromCache
      : ui.summarizeDone;
  } catch (error) {
    setError(errorMessage(error));
    statusEl.textContent = ui.idle;
  } finally {
    summarizeBtn.disabled = false;
  }
}

async function copyPageInfo(): Promise<void> {
  setError(null);
  setReloadAction(null);

  const settings = await loadSettings();
  if (!requireApiKey(settings)) {
    return;
  }

  const selected = await getSelectedTabs();
  const { translatable, restricted } = partitionTranslatableTabs(selected);
  const tab = translatable[0];
  if (!tab) {
    statusEl.textContent = ui.idle;
    setError(noTranslatableTabsMessage(restricted.length));
    return;
  }

  warmProvider(settings);
  copyBtn.disabled = true;
  statusEl.textContent = ui.copyStarting;

  try {
    const result = await sendToTab<CopyPageInfoResponse>(
      tab.id,
      { type: MESSAGE_TYPES.COPY_PAGE_INFO, targetLang: settings.targetLang },
      settings.autoRecoverContentScript,
    );
    if (!result.ok) {
      setError(result.error);
      statusEl.textContent = ui.idle;
      return;
    }
    await navigator.clipboard.writeText(result.text);
    statusEl.textContent = ui.copyDone;
  } catch (error) {
    setError(errorMessage(error));
    statusEl.textContent = ui.idle;
  } finally {
    copyBtn.disabled = false;
  }
}

async function init(): Promise<void> {
  applyStaticLabels();
  const settings = await loadSettings();
  if (!requireApiKey(settings)) {
    return;
  }
  warmProvider(settings);
  await refreshActionLabels();
  await refreshStatus();
}

startBtn.addEventListener('click', () => {
  void startTranslate();
});

stopBtn.addEventListener('click', () => {
  void stopTranslate();
});

summarizeBtn.addEventListener('click', () => {
  void startSummarize();
});

copyBtn.addEventListener('click', () => {
  void copyPageInfo();
});

reloadBtn.addEventListener('click', async () => {
  const tabId = pendingReloadTabId;
  if (typeof tabId !== 'number') {
    return;
  }

  reloadBtn.disabled = true;
  setError(null);
  statusEl.textContent = ui.reloading;

  try {
    await browser.tabs.reload(tabId);
    statusEl.textContent = ui.pageReloadedStarting;
    setReloadAction(null);
    await startTranslate();
  } catch (error) {
    setError(errorMessage(error));
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
