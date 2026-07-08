import 'bootstrap/dist/css/bootstrap.min.css';
import { MESSAGE_TYPES } from '@/shared/constants';
import { loadSettings, saveSettings } from '@/shared/settings';
import type { ExtensionMessage, TabStatus } from '@/features/translate/types';

const targetLangInput = document.querySelector<HTMLInputElement>('#target-lang')!;
const startBtn = document.querySelector<HTMLButtonElement>('#start-btn')!;
const stopBtn = document.querySelector<HTMLButtonElement>('#stop-btn')!;
const statusEl = document.querySelector<HTMLElement>('#status')!;
const errorEl = document.querySelector<HTMLElement>('#error')!;
const openOptions = document.querySelector<HTMLAnchorElement>('#open-options')!;

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
  statusEl.textContent = status.active
    ? `Translating… (${status.translatedCount} nodes)`
    : `Idle (${status.translatedCount} restored/ready)`;
  setError(status.error);
}

async function getActiveTabId(): Promise<number> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (typeof tabId !== 'number') {
    throw new Error('No active tab found');
  }
  return tabId;
}

async function sendToActiveTab<T>(message: ExtensionMessage): Promise<T> {
  const tabId = await getActiveTabId();
  try {
    return await browser.tabs.sendMessage(tabId, message) as Promise<T>;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Content script unavailable. Reload the page and try again. (${detail})`);
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

void init();
