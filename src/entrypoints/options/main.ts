import 'bootstrap/dist/css/bootstrap.min.css';
import { browser } from 'wxt/browser';
import {
  getProviderPreset,
  PROVIDER_IDS,
  type ProviderId,
} from '@/shared/providers';
import {
  applyProviderPreset,
  loadSettings,
  saveSettings,
  type ExtensionSettings,
} from '@/shared/settings';

const form = document.querySelector<HTMLFormElement>('#settings-form');
const providerSelect = document.querySelector<HTMLSelectElement>('#provider');
const baseUrlInput = document.querySelector<HTMLInputElement>('#base-url');
const apiKeyInput = document.querySelector<HTMLInputElement>('#api-key');
const modelInput = document.querySelector<HTMLInputElement>('#model');
const targetLangInput = document.querySelector<HTMLInputElement>('#target-lang');
const concurrencyInput = document.querySelector<HTMLInputElement>('#concurrency');
const autoRecoverInput = document.querySelector<HTMLInputElement>('#auto-recover');
const saveBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
const saveAlert = document.querySelector<HTMLElement>('#save-alert');
const saveError = document.querySelector<HTMLElement>('#save-error');

function setSaveError(message: string | null): void {
  if (!saveError) {
    if (message) {
      console.error(message);
    }
    return;
  }

  if (!message) {
    saveError.classList.add('d-none');
    saveError.textContent = '';
    return;
  }
  saveError.classList.remove('d-none');
  saveError.textContent = message;
}

function applyProviderUi(provider: ProviderId): void {
  if (!apiKeyInput || !modelInput) {
    return;
  }
  const preset = getProviderPreset(provider);
  apiKeyInput.placeholder = preset.apiKeyPlaceholder;
  modelInput.placeholder = preset.modelPlaceholder;
}

function fillForm(settings: ExtensionSettings): void {
  if (!providerSelect || !baseUrlInput || !apiKeyInput || !modelInput
    || !targetLangInput || !concurrencyInput || !autoRecoverInput) {
    return;
  }

  providerSelect.value = settings.provider;
  baseUrlInput.value = settings.baseUrl;
  apiKeyInput.value = settings.apiKey;
  modelInput.value = settings.model;
  targetLangInput.value = settings.targetLang;
  concurrencyInput.value = String(settings.concurrency);
  autoRecoverInput.checked = settings.autoRecoverContentScript;
  applyProviderUi(settings.provider);
}

function readForm(): ExtensionSettings {
  if (!providerSelect || !baseUrlInput || !apiKeyInput || !modelInput
    || !targetLangInput || !concurrencyInput || !autoRecoverInput) {
    throw new Error('Settings form is missing required fields.');
  }

  return {
    provider: providerSelect.value as ProviderId,
    baseUrl: baseUrlInput.value.trim(),
    apiKey: apiKeyInput.value,
    model: modelInput.value.trim(),
    targetLang: targetLangInput.value.trim(),
    concurrency: Number(concurrencyInput.value),
    autoRecoverContentScript: autoRecoverInput.checked,
  };
}

async function handleSave(): Promise<void> {
  setSaveError(null);
  saveAlert?.classList.add('d-none');
  if (saveBtn) {
    saveBtn.disabled = true;
  }

  try {
    const saved = await saveSettings(readForm());
    fillForm(saved);
    saveAlert?.classList.remove('d-none');
    window.setTimeout(() => {
      saveAlert?.classList.add('d-none');
    }, 2500);
  } catch (error) {
    setSaveError(error instanceof Error ? error.message : String(error));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  }
}

function init(): void {
  if (!form || !providerSelect) {
    setSaveError('Settings page failed to initialize. Reload the extension and open Options again.');
    return;
  }

  providerSelect.addEventListener('change', () => {
    const provider = providerSelect.value as ProviderId;
    const next = applyProviderPreset(readForm(), provider);
    if (provider !== 'custom' && baseUrlInput && modelInput) {
      baseUrlInput.value = next.baseUrl;
      modelInput.value = next.model;
    }
    applyProviderUi(provider);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void handleSave();
  });

  for (const provider of PROVIDER_IDS) {
    const preset = getProviderPreset(provider);
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = preset.label;
    providerSelect.append(option);
  }

  void loadSettings().then((settings) => {
    fillForm(settings);
  }).catch((error: unknown) => {
    setSaveError(error instanceof Error ? error.message : String(error));
  });

  void browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.settings?.newValue) {
      return;
    }
    fillForm(changes.settings.newValue as ExtensionSettings);
  });
}

init();
