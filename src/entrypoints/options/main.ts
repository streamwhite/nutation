import 'bootstrap/dist/css/bootstrap.min.css';
import { browser } from 'wxt/browser';
import {
  getCacheStoreStats,
  type CacheStoreStats,
} from '@/features/translate/cache-store';
import { clearTranslationCache } from '@/features/translate/cache';
import { bindLanguagePicker } from '@/features/options/language-picker';
import { findTargetLanguage } from '@/shared/languages';
import {
  getProviderPreset,
  listProvidersByCategory,
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  resolveProviderBaseUrl,
  type ProviderId,
} from '@/shared/providers';
import { formatBytes } from '@/shared/format-bytes';
import { STORAGE_KEYS } from '@/shared/constants';
import {
  loadSettings,
  parseSettings,
  saveSettings,
  type ExtensionSettings,
} from '@/shared/settings';
import {
  TRANSLATION_MODES,
  TRANSLATION_MODE_LABELS,
  TRANSLATION_MODE_NOTES,
  type TranslationMode,
} from '@/shared/translation-mode';

const form = document.querySelector<HTMLFormElement>('#settings-form');
const providerSelect = document.querySelector<HTMLSelectElement>('#provider');
const baseUrlGroup = document.querySelector<HTMLElement>('#base-url-group');
const baseUrlInput = document.querySelector<HTMLInputElement>('#base-url');
const apiKeyInput = document.querySelector<HTMLInputElement>('#api-key');
const modelInput = document.querySelector<HTMLInputElement>('#model');
const targetLangInput = document.querySelector<HTMLInputElement>('#target-lang');
const targetLangSearch = document.querySelector<HTMLInputElement>('#target-lang-search');
const targetLangResults = document.querySelector<HTMLElement>('#target-lang-results');
const translationModeSelect = document.querySelector<HTMLSelectElement>('#translation-mode');
const translationModeHelp = document.querySelector<HTMLElement>('#translation-mode-help');
const autoRecoverInput = document.querySelector<HTMLInputElement>('#auto-recover');
const saveBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
const saveAlert = document.querySelector<HTMLElement>('#save-alert');
const saveError = document.querySelector<HTMLElement>('#save-error');
const cacheEntryCountEl = document.querySelector<HTMLElement>('#cache-entry-count');
const cacheDataSizeEl = document.querySelector<HTMLElement>('#cache-data-size');
const cacheCapacityEstimateEl = document.querySelector<HTMLElement>('#cache-capacity-estimate');
const cacheStorageUsageEl = document.querySelector<HTMLElement>('#cache-storage-usage');
const clearCacheBtn = document.querySelector<HTMLButtonElement>('#clear-cache-btn');
const cacheErrorEl = document.querySelector<HTMLElement>('#cache-error');

let languagePickerBound = false;

function setCacheError(message: string | null): void {
  if (!cacheErrorEl) {
    if (message) {
      console.error(message);
    }
    return;
  }

  if (!message) {
    cacheErrorEl.classList.add('d-none');
    cacheErrorEl.textContent = '';
    return;
  }
  cacheErrorEl.classList.remove('d-none');
  cacheErrorEl.textContent = message;
}

function formatEntryCount(stats: CacheStoreStats): string {
  return `${stats.entryCount.toLocaleString()} / ${stats.maxEntries.toLocaleString()}`;
}

function formatStorageUsage(stats: CacheStoreStats): string {
  if (stats.storageUsageBytes === null || stats.storageQuotaBytes === null) {
    return 'Unavailable in this browser';
  }
  return `${formatBytes(stats.storageUsageBytes)} / ${formatBytes(stats.storageQuotaBytes)}`;
}

function renderCacheStats(stats: CacheStoreStats): void {
  if (cacheEntryCountEl) {
    cacheEntryCountEl.textContent = formatEntryCount(stats);
  }
  if (cacheDataSizeEl) {
    cacheDataSizeEl.textContent = formatBytes(stats.estimatedBytes);
  }
  if (cacheCapacityEstimateEl) {
    cacheCapacityEstimateEl.textContent = `Up to ${formatBytes(stats.estimatedMaxBytes)} at full capacity`;
  }
  if (cacheStorageUsageEl) {
    cacheStorageUsageEl.textContent = formatStorageUsage(stats);
  }
}

async function refreshCacheStats(): Promise<void> {
  try {
    const stats = await getCacheStoreStats();
    renderCacheStats(stats);
    setCacheError(null);
  } catch (error) {
    setCacheError(error instanceof Error ? error.message : String(error));
  }
}

async function handleClearCache(): Promise<void> {
  if (!clearCacheBtn) {
    return;
  }

  clearCacheBtn.disabled = true;
  setCacheError(null);

  try {
    await clearTranslationCache();
    await refreshCacheStats();
  } catch (error) {
    setCacheError(error instanceof Error ? error.message : String(error));
  } finally {
    clearCacheBtn.disabled = false;
  }
}

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
  modelInput.placeholder = preset.modelPlaceholder;

  const isCustom = provider === 'custom';
  if (baseUrlGroup) {
    baseUrlGroup.classList.toggle('d-none', !isCustom);
  }
  if (baseUrlInput) {
    baseUrlInput.required = isCustom;
    if (!isCustom) {
      baseUrlInput.value = preset.baseUrl;
    }
  }
}

function updateTranslationModeHelp(mode: TranslationMode): void {
  if (!translationModeHelp) {
    return;
  }
  translationModeHelp.textContent = TRANSLATION_MODE_NOTES[mode];
}

function syncLanguagePicker(code: string): void {
  if (!targetLangInput || !targetLangSearch) {
    return;
  }
  targetLangInput.value = code;
  const language = findTargetLanguage(code);
  if (language) {
    targetLangSearch.value = language.name;
  }
}

function ensureLanguagePicker(initialCode: string): void {
  if (
    !languagePickerBound
    && targetLangSearch
    && targetLangInput
    && targetLangResults
  ) {
    bindLanguagePicker({
      searchInput: targetLangSearch,
      codeInput: targetLangInput,
      results: targetLangResults,
    }, initialCode);
    languagePickerBound = true;
  }
  syncLanguagePicker(initialCode);
}

function fillForm(settings: ExtensionSettings): void {
  if (!providerSelect || !apiKeyInput || !modelInput
    || !targetLangInput || !translationModeSelect || !autoRecoverInput) {
    return;
  }

  providerSelect.value = settings.provider;
  if (baseUrlInput) {
    baseUrlInput.value = settings.baseUrl;
  }
  apiKeyInput.value = settings.apiKey;
  modelInput.value = settings.model;
  ensureLanguagePicker(settings.targetLang);
  translationModeSelect.value = settings.translationMode;
  updateTranslationModeHelp(settings.translationMode);
  autoRecoverInput.checked = settings.autoRecoverContentScript;
  applyProviderUi(settings.provider);
}

function readForm(): ExtensionSettings {
  if (!providerSelect || !apiKeyInput || !modelInput
    || !targetLangInput || !translationModeSelect || !autoRecoverInput) {
    throw new Error('Settings form is missing required fields.');
  }

  const targetLang = targetLangInput.value.trim();
  if (!targetLang) {
    throw new Error('Pick a target language from the search results.');
  }

  const provider = providerSelect.value as ProviderId;
  const customBaseUrl = baseUrlInput?.value.trim() ?? '';
  if (provider === 'custom' && !customBaseUrl) {
    throw new Error('API URL is required for Custom provider.');
  }

  return {
    provider,
    baseUrl: resolveProviderBaseUrl(provider, customBaseUrl),
    apiKey: apiKeyInput.value,
    model: modelInput.value.trim(),
    targetLang,
    translationMode: translationModeSelect.value as TranslationMode,
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

function populateProviderSelect(): void {
  if (!providerSelect) {
    return;
  }

  for (const category of PROVIDER_CATEGORIES) {
    const group = document.createElement('optgroup');
    group.label = PROVIDER_CATEGORY_LABELS[category];
    for (const preset of listProvidersByCategory(category)) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.label;
      group.append(option);
    }
    providerSelect.append(group);
  }
}

function init(): void {
  if (!form || !providerSelect || !translationModeSelect) {
    setSaveError('Settings page failed to initialize. Reload the extension and open Options again.');
    return;
  }

  providerSelect.addEventListener('change', () => {
    const provider = providerSelect.value as ProviderId;
    const preset = getProviderPreset(provider);
    if (provider !== 'custom' && modelInput) {
      modelInput.value = preset.defaultModel;
    }
    applyProviderUi(provider);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void handleSave();
  });

  clearCacheBtn?.addEventListener('click', () => {
    void handleClearCache();
  });

  populateProviderSelect();

  for (const mode of TRANSLATION_MODES) {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = TRANSLATION_MODE_LABELS[mode];
    translationModeSelect.append(option);
  }

  translationModeSelect.addEventListener('change', () => {
    updateTranslationModeHelp(translationModeSelect.value as TranslationMode);
  });

  void loadSettings().then((settings) => {
    fillForm(settings);
  }).catch((error: unknown) => {
    setSaveError(error instanceof Error ? error.message : String(error));
  });

  void refreshCacheStats();

  void browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.SETTINGS]?.newValue) {
      return;
    }
    fillForm(parseSettings(changes[STORAGE_KEYS.SETTINGS].newValue));
  });
}

init();
