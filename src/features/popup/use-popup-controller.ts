import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { browser } from 'wxt/browser';
import {
  isConnectionError,
  isRestrictedUrl,
} from '@/features/content-script/recover';
import {
  mergeTabStatuses,
  sendMessageToAllFrames,
} from '@/features/content-script/frame-messaging';
import {
  contentScriptUnavailableMessage,
  formatStatus,
  noTranslatableTabsMessage,
  restoredTabsMessage,
  skippedRestrictedMessage,
  startedTabsMessage,
} from '@/features/popup/popup-messages';
import {
  normalizePopupTabs,
  partitionTranslatableTabs,
  summarizeMultiTabResults,
  type MultiTabResult,
  type PopupTab,
} from '@/features/popup/selected-tabs';
import { hasApiKey } from '@/shared/api-key';
import { MESSAGE_TYPES, POPUP_STATUS_POLL_MS } from '@/shared/constants';
import { loadSettings, type ExtensionSettings } from '@/shared/settings';
import type {
  ContentScriptMessage,
  CopyPageInfoResponse,
  EnsureContentScriptResponse,
  SummarizePageResponse,
  TabStatus,
} from '@/features/translate/types';

export type BusyAction = 'summarize' | 'copy' | 'reload' | null;

export type PopupController = {
  tabCount: number;
  statusText: string;
  translating: boolean;
  error: string | null;
  reloadTabId: number | null;
  apiKeyMissing: boolean;
  busy: BusyAction;
  translate: () => void;
  restore: () => void;
  summarize: () => void;
  copyInfo: () => void;
  reload: () => void;
  openOptions: () => void;
};

const CONTENT_SCRIPT_ERROR_PATTERN = /content script unavailable|receiving end does not exist/i;
const RESTRICTED_PAGE_PATTERN = /cannot be translated/i;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function querySelectedTabs(): Promise<PopupTab[]> {
  const highlighted = await browser.tabs.query({ highlighted: true, currentWindow: true });
  const selected = normalizePopupTabs(highlighted);
  if (selected.length > 0) {
    return selected;
  }
  const active = await browser.tabs.query({ active: true, currentWindow: true });
  return normalizePopupTabs(active);
}

async function queryActiveTab(): Promise<PopupTab> {
  const tabs = await querySelectedTabs();
  const active = tabs.find((tab) => !isRestrictedUrl(tab.url)) ?? tabs[0];
  if (!active) {
    throw new Error('No active tab found');
  }
  return active;
}

function pickFirstOk<T extends { ok: boolean }>(results: T[], fallbackError: string): T {
  return results.find((item) => item.ok)
    ?? results[0]
    ?? ({ ok: false, error: fallbackError } as unknown as T);
}

function resolveTabResults<T>(
  intl: ReturnType<typeof useIntl>,
  message: ContentScriptMessage,
  results: unknown[],
): T {
  if (
    message.type === MESSAGE_TYPES.GET_TAB_STATUS
    || message.type === MESSAGE_TYPES.START_TRANSLATE
    || message.type === MESSAGE_TYPES.STOP_TRANSLATE
  ) {
    return mergeTabStatuses(results as TabStatus[]) as T;
  }
  if (message.type === MESSAGE_TYPES.SUMMARIZE_PAGE) {
    return pickFirstOk(
      results as SummarizePageResponse[],
      intl.formatMessage({ id: 'summarize.topFrameOnly' }),
    ) as T;
  }
  if (message.type === MESSAGE_TYPES.COPY_PAGE_INFO) {
    return pickFirstOk(
      results as CopyPageInfoResponse[],
      intl.formatMessage({ id: 'copy.topFrameOnly' }),
    ) as T;
  }
  return results[0] as T;
}

function connectionError(
  intl: ReturnType<typeof useIntl>,
  error: unknown,
): Error {
  return new Error(contentScriptUnavailableMessage(intl, errorMessage(error)));
}

async function recoverContentScript(tabId: number): Promise<EnsureContentScriptResponse> {
  return browser.runtime.sendMessage({
    type: MESSAGE_TYPES.ENSURE_CONTENT_SCRIPT,
    tabId,
  }) as Promise<EnsureContentScriptResponse>;
}

async function sendToTab<T>(
  intl: ReturnType<typeof useIntl>,
  tabId: number,
  message: ContentScriptMessage,
  autoRecover: boolean,
  onProgress: (message: string) => void,
): Promise<T> {
  try {
    const results = await sendMessageToAllFrames<T>(tabId, message);
    return resolveTabResults<T>(intl, message, results);
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }
    if (!autoRecover) {
      throw connectionError(intl, error);
    }

    onProgress(intl.formatMessage({ id: 'popup.recovering' }));
    const recovered = await recoverContentScript(tabId);
    if (!recovered.ok) {
      throw new Error(recovered.error ?? 'Failed to recover content script');
    }
    if (recovered.recovered && recovered.method === 'reload') {
      onProgress(intl.formatMessage({ id: 'popup.pageReloadedRetry' }));
    }

    try {
      const results = await sendMessageToAllFrames<T>(tabId, message);
      return resolveTabResults<T>(intl, message, results);
    } catch (retryError) {
      throw connectionError(intl, retryError);
    }
  }
}

async function runOnTabs(
  intl: ReturnType<typeof useIntl>,
  tabs: PopupTab[],
  autoRecover: boolean,
  message: ContentScriptMessage,
  onProgress: (message: string) => void,
): Promise<MultiTabResult[]> {
  return Promise.all(tabs.map(async (tab) => {
    try {
      await sendToTab<TabStatus>(intl, tab.id, message, autoRecover, onProgress);
      return { ok: true as const, tabId: tab.id };
    } catch (error) {
      return { ok: false as const, tabId: tab.id, error: errorMessage(error) };
    }
  }));
}

function warmProvider(settings: ExtensionSettings): void {
  void browser.runtime.sendMessage({
    type: MESSAGE_TYPES.WARM_PROVIDER,
    settings,
  }).catch(() => undefined);
}

export function usePopupController(): PopupController {
  const intl = useIntl();
  const [tabCount, setTabCount] = useState(1);
  const [statusText, setStatusText] = useState(() => intl.formatMessage({ id: 'popup.status.idle' }));
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTabId, setReloadTabId] = useState<number | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  const applyStatus = (status: TabStatus, count: number) => {
    setStatusText(formatStatus(intl, status, count));
    setError(status.error);
    setReloadTabId(null);
    setTranslating(status.active);
  };

  const showIdle = () => {
    setStatusText(intl.formatMessage({ id: 'popup.status.idle' }));
  };

  const handleStatusError = async (failure: unknown) => {
    const message = errorMessage(failure);
    setTranslating(false);

    if (RESTRICTED_PAGE_PATTERN.test(message)) {
      setStatusText(intl.formatMessage({ id: 'popup.openWebsiteTab' }));
      setError(null);
      setReloadTabId(null);
      return;
    }

    setError(message);
    setReloadTabId(null);
    if (!isConnectionError(failure) && !CONTENT_SCRIPT_ERROR_PATTERN.test(message)) {
      return;
    }

    const settings = await loadSettings().catch(() => null);
    if (settings && !settings.autoRecoverContentScript) {
      const tab = await queryActiveTab().catch(() => null);
      setReloadTabId(tab?.id ?? null);
    }
  };

  const refreshStatus = async () => {
    const tabs = await querySelectedTabs();
    setTabCount(Math.max(1, tabs.length));
    const { translatable } = partitionTranslatableTabs(tabs);
    const tab = translatable[0] ?? tabs[0];
    if (!tab || isRestrictedUrl(tab.url)) {
      setStatusText(intl.formatMessage({ id: 'popup.openWebsiteTab' }));
      setError(null);
      setReloadTabId(null);
      setTranslating(false);
      return;
    }

    try {
      const settings = await loadSettings();
      const statuses = await Promise.all(translatable.map((item) => sendToTab<TabStatus>(
        intl,
        item.id,
        { type: MESSAGE_TYPES.GET_TAB_STATUS },
        settings.autoRecoverContentScript,
        setStatusText,
      )));
      applyStatus(mergeTabStatuses(statuses), translatable.length);
    } catch (failure) {
      await handleStatusError(failure);
    }
  };

  useEffect(() => {
    refreshRef.current = refreshStatus;
  });

  useEffect(() => {
    if (!translating) {
      return undefined;
    }
    const timer = setInterval(() => {
      void refreshRef.current();
    }, POPUP_STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [translating]);

  const requireApiKey = (settings: ExtensionSettings): boolean => {
    if (hasApiKey(settings)) {
      setApiKeyMissing(false);
      return true;
    }
    setApiKeyMissing(true);
    setError(intl.formatMessage({ id: 'popup.apiKeyMissing' }));
    setReloadTabId(null);
    setTranslating(false);
    showIdle();
    return false;
  };

  const translate = async () => {
    setError(null);
    setReloadTabId(null);

    const settings = await loadSettings();
    if (!requireApiKey(settings)) {
      return;
    }

    const selected = await querySelectedTabs();
    setTabCount(Math.max(1, selected.length));
    const { translatable, restricted } = partitionTranslatableTabs(selected);
    if (translatable.length === 0) {
      showIdle();
      setError(noTranslatableTabsMessage(intl, restricted.length));
      return;
    }

    warmProvider(settings);
    setStatusText(intl.formatMessage(
      { id: translatable.length > 1 ? 'popup.startingTabs' : 'popup.starting' },
      { count: translatable.length },
    ));

    const results = await runOnTabs(intl, translatable, settings.autoRecoverContentScript, {
      type: MESSAGE_TYPES.START_TRANSLATE,
      targetLang: settings.targetLang,
    }, setStatusText);
    const summary = summarizeMultiTabResults(results);

    if (summary.started > 0) {
      applyStatus({ active: true, error: null, translatedCount: 0 }, summary.started);
    }
    if (summary.failed > 0) {
      setError(startErrorText(summary, translatable.length, restricted.length));
      maybeOfferReload(settings, summary);
      return;
    }
    if (restricted.length > 0) {
      setError(skippedRestrictedMessage(intl, restricted.length));
    }
  };

  const startErrorText = (
    summary: ReturnType<typeof summarizeMultiTabResults>,
    total: number,
    restrictedCount: number,
  ): string => {
    const skipped = restrictedCount > 0
      ? ` ${skippedRestrictedMessage(intl, restrictedCount)}`
      : '';
    const prefix = summary.started > 0
      ? `${startedTabsMessage(intl, summary, total)} `
      : '';
    return `${prefix}${summary.firstError ?? ''}${skipped}`;
  };

  const maybeOfferReload = (
    settings: ExtensionSettings,
    summary: ReturnType<typeof summarizeMultiTabResults>,
  ): void => {
    if (settings.autoRecoverContentScript || summary.started !== 0) {
      return;
    }
    if (summary.firstFailedTabId !== null
      && CONTENT_SCRIPT_ERROR_PATTERN.test(summary.firstError ?? '')) {
      setReloadTabId(summary.firstFailedTabId);
    }
  };

  const restore = async () => {
    setError(null);
    setReloadTabId(null);

    const selected = await querySelectedTabs();
    setTabCount(Math.max(1, selected.length));
    const { translatable, restricted } = partitionTranslatableTabs(selected);
    if (translatable.length === 0) {
      setError(noTranslatableTabsMessage(intl, restricted.length));
      return;
    }

    const settings = await loadSettings();
    const results = await runOnTabs(intl, translatable, settings.autoRecoverContentScript, {
      type: MESSAGE_TYPES.STOP_TRANSLATE,
    }, setStatusText);
    const summary = summarizeMultiTabResults(results);

    if (summary.started > 0) {
      applyStatus({ active: false, error: null, translatedCount: 0 }, summary.started);
    }
    if (summary.failed > 0) {
      const prefix = summary.started > 0
        ? `${restoredTabsMessage(intl, summary, translatable.length)} `
        : '';
      setError(`${prefix}${summary.firstError ?? ''}`);
    }
  };

  const summarize = async () => {
    setError(null);
    setReloadTabId(null);

    const settings = await loadSettings();
    if (!requireApiKey(settings)) {
      return;
    }

    const selected = await querySelectedTabs();
    const { translatable, restricted } = partitionTranslatableTabs(selected);
    const tab = translatable[0];
    if (!tab) {
      showIdle();
      setError(noTranslatableTabsMessage(intl, restricted.length));
      return;
    }

    warmProvider(settings);
    setBusy('summarize');
    setStatusText(intl.formatMessage({ id: 'popup.summarizeStarting' }));

    try {
      const result = await sendToTab<SummarizePageResponse>(intl, tab.id, {
        type: MESSAGE_TYPES.SUMMARIZE_PAGE,
        targetLang: settings.targetLang,
      }, settings.autoRecoverContentScript, setStatusText);
      if (!result.ok) {
        setError(result.error);
        showIdle();
        return;
      }
      setStatusText(intl.formatMessage({
        id: result.fromCache ? 'popup.summarizeDoneFromCache' : 'popup.summarizeDone',
      }));
    } catch (failure) {
      setError(errorMessage(failure));
      showIdle();
    } finally {
      setBusy(null);
    }
  };

  const copyInfo = async () => {
    setError(null);
    setReloadTabId(null);

    const settings = await loadSettings();
    if (!requireApiKey(settings)) {
      return;
    }

    const selected = await querySelectedTabs();
    const { translatable, restricted } = partitionTranslatableTabs(selected);
    const tab = translatable[0];
    if (!tab) {
      showIdle();
      setError(noTranslatableTabsMessage(intl, restricted.length));
      return;
    }

    warmProvider(settings);
    setBusy('copy');
    setStatusText(intl.formatMessage({ id: 'popup.copyStarting' }));

    try {
      const result = await sendToTab<CopyPageInfoResponse>(intl, tab.id, {
        type: MESSAGE_TYPES.COPY_PAGE_INFO,
        targetLang: settings.targetLang,
      }, settings.autoRecoverContentScript, setStatusText);
      if (!result.ok) {
        setError(result.error);
        showIdle();
        return;
      }
      await navigator.clipboard.writeText(result.text);
      setStatusText(intl.formatMessage({ id: 'popup.copyDone' }));
    } catch (failure) {
      setError(errorMessage(failure));
      showIdle();
    } finally {
      setBusy(null);
    }
  };

  const reload = async () => {
    if (typeof reloadTabId !== 'number') {
      return;
    }
    const tabId = reloadTabId;
    setBusy('reload');
    setError(null);
    setStatusText(intl.formatMessage({ id: 'popup.reloading' }));

    try {
      await browser.tabs.reload(tabId);
      setStatusText(intl.formatMessage({ id: 'popup.pageReloadedStarting' }));
      setReloadTabId(null);
      await translate();
    } catch (failure) {
      setError(errorMessage(failure));
      setReloadTabId(tabId);
    } finally {
      setBusy(null);
    }
  };

  const openOptions = () => {
    void browser.runtime.openOptionsPage();
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const settings = await loadSettings();
        if (cancelled || !requireApiKey(settings)) {
          return;
        }
        warmProvider(settings);
        await refreshRef.current();
      } catch (failure) {
        if (!cancelled) {
          setError(errorMessage(failure));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    tabCount,
    statusText,
    translating,
    error,
    reloadTabId,
    apiKeyMissing,
    busy,
    translate: () => void translate(),
    restore: () => void restore(),
    summarize: () => void summarize(),
    copyInfo: () => void copyInfo(),
    reload: () => void reload(),
    openOptions,
  };
}
