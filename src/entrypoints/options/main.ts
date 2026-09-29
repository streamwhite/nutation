import 'bootstrap/dist/css/bootstrap.min.css';
import { browser } from 'wxt/browser';
import {
  getCacheStoreStats,
  trimStoreToMaxEntries,
  type CacheStoreStats,
} from '@/features/translate/cache-store';
import {
  estimateCacheCapacityBytes,
  resolveCacheMaxEntries,
} from '@/features/translate/cache-max-entries';
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
import {
  STORAGE_KEYS,
  TRANSLATION_CACHE_ENTRIES_HARD_LIMIT,
  TRANSLATION_CACHE_MAX_ENTRIES,
  TRANSLATION_CACHE_MIN_ENTRIES,
} from '@/shared/constants';
import {
  loadSettings,
  parseSettings,
  saveSettings,
  type ExtensionSettings,
} from '@/shared/settings';
import {
  createEmptyTranslateOnOpenRule,
  readTranslateOnOpenRulesFromRoot,
  renderTranslateOnOpenRuleRow,
} from '@/features/options/translate-on-open-ui';
import {
  TRANSLATION_MODES,
  TRANSLATION_MODE_LABELS,
  TRANSLATION_MODE_NOTES,
  type TranslationMode,
} from '@/shared/translation-mode';
import {
  SUMMARY_POSITIONS,
  SUMMARY_POSITION_LABELS,
  type SummaryPosition,
} from '@/features/summarize/summary-position';

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
const summaryPositionSelect = document.querySelector<HTMLSelectElement>('#summary-position');
const copyIncludeLinkInput = document.querySelector<HTMLInputElement>('#copy-include-link');
const autoRecoverInput = document.querySelector<HTMLInputElement>('#auto-recover');
const translateOnOpenInput = document.querySelector<HTMLInputElement>('#translate-on-open');
const translateOnOpenRulesRoot = document.querySelector<HTMLElement>('#translate-on-open-rules');
const addTranslateOnOpenRuleBtn = document.querySelector<HTMLButtonElement>('#add-translate-on-open-rule');
const saveTranslateOnOpenBtn = document.querySelector<HTMLButtonElement>('#save-translate-on-open');
const translateOnOpenAlert = document.querySelector<HTMLElement>('#translate-on-open-alert');
const translateOnOpenError = document.querySelector<HTMLElement>('#translate-on-open-error');
const saveBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
const saveAlert = document.querySelector<HTMLElement>('#save-alert');
const saveError = document.querySelector<HTMLElement>('#save-error');
const cacheMaxEntriesInput = document.querySelector<HTMLInputElement>('#cache-max-entries');
const cacheMaxEntriesEstimateEl = document.querySelector<HTMLElement>('#cache-max-entries-estimate');
const cacheEntryCountEl = document.querySelector<HTMLElement>('#cache-entry-count');
const cacheDataSizeEl = document.querySelector<HTMLElement>('#cache-data-size');
const cacheCapacityEstimateEl = document.querySelector<HTMLElement>('#cache-capacity-estimate');
const cacheStorageUsageEl = document.querySelector<HTMLElement>('#cache-storage-usage');
const saveCacheSettingsBtn = document.querySelector<HTMLButtonElement>('#save-cache-settings-btn');
const clearCacheBtn = document.querySelector<HTMLButtonElement>('#clear-cache-btn');
const cacheSaveAlert = document.querySelector<HTMLElement>('#cache-save-alert');
const cacheErrorEl = document.querySelector<HTMLElement>('#cache-error');

let languagePickerBound = false;
let configuredCacheMaxEntries = TRANSLATION_CACHE_MAX_ENTRIES;

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

function formatCapacityEstimate(maxEntries: number): string {
  const limit = resolveCacheMaxEntries(maxEntries);
  return `Estimated space at full capacity: ${formatBytes(estimateCacheCapacityBytes(limit))}`;
}

function updateCacheMaxEntriesEstimate(): void {
  if (!cacheMaxEntriesEstimateEl || !cacheMaxEntriesInput) {
    return;
  }
  cacheMaxEntriesEstimateEl.textContent = formatCapacityEstimate(cacheMaxEntriesInput.value);
}

function bindCacheMaxEntriesInput(): void {
  if (!cacheMaxEntriesInput) {
    return;
  }
  cacheMaxEntriesInput.min = String(TRANSLATION_CACHE_MIN_ENTRIES);
  cacheMaxEntriesInput.max = String(TRANSLATION_CACHE_ENTRIES_HARD_LIMIT);
  cacheMaxEntriesInput.step = String(TRANSLATION_CACHE_MIN_ENTRIES);
  cacheMaxEntriesInput.addEventListener('input', () => {
    updateCacheMaxEntriesEstimate();
  });
}

function fillCacheMaxEntries(maxEntries: number): void {
  configuredCacheMaxEntries = resolveCacheMaxEntries(maxEntries);
  if (cacheMaxEntriesInput) {
    cacheMaxEntriesInput.value = String(configuredCacheMaxEntries);
  }
  updateCacheMaxEntriesEstimate();
}

function readCacheMaxEntriesField(): number {
  if (!cacheMaxEntriesInput) {
    return configuredCacheMaxEntries;
  }
  return resolveCacheMaxEntries(cacheMaxEntriesInput.value, configuredCacheMaxEntries);
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

async function refreshCacheStats(maxEntries = configuredCacheMaxEntries): Promise<void> {
  try {
    const stats = await getCacheStoreStats(maxEntries);
    renderCacheStats(stats);
    setCacheError(null);
  } catch (error) {
    setCacheError(error instanceof Error ? error.message : String(error));
  }
}

async function handleSaveCacheSettings(): Promise<void> {
  if (saveCacheSettingsBtn) {
    saveCacheSettingsBtn.disabled = true;
  }
  setCacheError(null);
  cacheSaveAlert?.classList.add('d-none');

  try {
    const cacheMaxEntries = readCacheMaxEntriesField();
    const current = await loadSettings();
    const saved = await saveSettings({
      ...current,
      cacheMaxEntries,
    });
    fillCacheMaxEntries(saved.cacheMaxEntries);
    await trimStoreToMaxEntries(saved.cacheMaxEntries);
    await refreshCacheStats(saved.cacheMaxEntries);
    cacheSaveAlert?.classList.remove('d-none');
    window.setTimeout(() => {
      cacheSaveAlert?.classList.add('d-none');
    }, 2500);
  } catch (error) {
    setCacheError(error instanceof Error ? error.message : String(error));
  } finally {
    if (saveCacheSettingsBtn) {
      saveCacheSettingsBtn.disabled = false;
    }
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

function setTranslateOnOpenError(message: string | null): void {
  if (!translateOnOpenError) {
    if (message) {
      console.error(message);
    }
    return;
  }
  if (!message) {
    translateOnOpenError.classList.add('d-none');
    translateOnOpenError.textContent = '';
    return;
  }
  translateOnOpenError.classList.remove('d-none');
  translateOnOpenError.textContent = message;
}

function readTranslateOnOpenFields(): Pick<
  ExtensionSettings,
  'translateOnOpen' | 'translateOnOpenRules'
> {
  return {
    translateOnOpen: translateOnOpenInput?.checked !== false,
    translateOnOpenRules: translateOnOpenRulesRoot
      ? readTranslateOnOpenRulesFromRoot(translateOnOpenRulesRoot)
      : [],
  };
}

function appendTranslateOnOpenRule(
  rule = createEmptyTranslateOnOpenRule(),
): void {
  if (!translateOnOpenRulesRoot) {
    return;
  }
  const row = renderTranslateOnOpenRuleRow(rule, (target) => {
    target.remove();
  });
  translateOnOpenRulesRoot.append(row);
}

function fillTranslateOnOpen(settings: ExtensionSettings): void {
  if (translateOnOpenInput) {
    translateOnOpenInput.checked = settings.translateOnOpen;
  }
  if (!translateOnOpenRulesRoot) {
    return;
  }
  translateOnOpenRulesRoot.replaceChildren();
  for (const rule of settings.translateOnOpenRules) {
    appendTranslateOnOpenRule(rule);
  }
}

function fillForm(settings: ExtensionSettings): void {
  if (!providerSelect || !apiKeyInput || !modelInput
    || !targetLangInput || !translationModeSelect || !autoRecoverInput
    || !summaryPositionSelect || !copyIncludeLinkInput) {
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
  summaryPositionSelect.value = settings.summaryPosition;
  autoRecoverInput.checked = settings.autoRecoverContentScript;
  copyIncludeLinkInput.checked = settings.copyIncludeLink;
  applyProviderUi(settings.provider);
  fillTranslateOnOpen(settings);
  fillCacheMaxEntries(settings.cacheMaxEntries);
}

function readForm(): ExtensionSettings {
  if (!providerSelect || !apiKeyInput || !modelInput
    || !targetLangInput || !translationModeSelect || !autoRecoverInput
    || !summaryPositionSelect || !copyIncludeLinkInput) {
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
    ...readTranslateOnOpenFields(),
    summaryPosition: summaryPositionSelect.value as SummaryPosition,
    cacheMaxEntries: readCacheMaxEntriesField(),
    copyIncludeLink: copyIncludeLinkInput.checked,
  };
}

async function handleSaveTranslateOnOpen(): Promise<void> {
  setTranslateOnOpenError(null);
  translateOnOpenAlert?.classList.add('d-none');
  if (saveTranslateOnOpenBtn) {
    saveTranslateOnOpenBtn.disabled = true;
  }

  try {
    const current = await loadSettings();
    const saved = await saveSettings({
      ...current,
      ...readTranslateOnOpenFields(),
    });
    fillTranslateOnOpen(saved);
    translateOnOpenAlert?.classList.remove('d-none');
    window.setTimeout(() => {
      translateOnOpenAlert?.classList.add('d-none');
    }, 2500);
  } catch (error) {
    setTranslateOnOpenError(error instanceof Error ? error.message : String(error));
  } finally {
    if (saveTranslateOnOpenBtn) {
      saveTranslateOnOpenBtn.disabled = false;
    }
  }
}

async function handleSave(): Promise<void> {
  setSaveError(null);
  saveAlert?.classList.add('d-none');
  if (saveBtn) {
    saveBtn.disabled = true;
  }

  try {
    const previousMax = configuredCacheMaxEntries;
    const saved = await saveSettings(readForm());
    fillForm(saved);
    if (saved.cacheMaxEntries < previousMax) {
      await trimStoreToMaxEntries(saved.cacheMaxEntries);
    }
    await refreshCacheStats(saved.cacheMaxEntries);
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
  if (!form || !providerSelect || !translationModeSelect || !summaryPositionSelect) {
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

  saveCacheSettingsBtn?.addEventListener('click', () => {
    void handleSaveCacheSettings();
  });

  addTranslateOnOpenRuleBtn?.addEventListener('click', () => {
    appendTranslateOnOpenRule();
  });

  saveTranslateOnOpenBtn?.addEventListener('click', () => {
    void handleSaveTranslateOnOpen();
  });

  populateProviderSelect();
  bindCacheMaxEntriesInput();

  for (const mode of TRANSLATION_MODES) {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = TRANSLATION_MODE_LABELS[mode];
    translationModeSelect.append(option);
  }

  for (const position of SUMMARY_POSITIONS) {
    const option = document.createElement('option');
    option.value = position;
    option.textContent = SUMMARY_POSITION_LABELS[position];
    summaryPositionSelect.append(option);
  }

  translationModeSelect.addEventListener('change', () => {
    updateTranslationModeHelp(translationModeSelect.value as TranslationMode);
  });

  void loadSettings().then((settings) => {
    fillForm(settings);
    void refreshCacheStats(settings.cacheMaxEntries);
  }).catch((error: unknown) => {
    setSaveError(error instanceof Error ? error.message : String(error));
    void refreshCacheStats();
  });

  void browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.SETTINGS]?.newValue) {
      return;
    }
    const settings = parseSettings(changes[STORAGE_KEYS.SETTINGS].newValue);
    fillForm(settings);
    void refreshCacheStats(settings.cacheMaxEntries);
  });
}

init();
