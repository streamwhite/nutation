import 'bootstrap/dist/css/bootstrap.min.css';
import { loadSettings, saveSettings, type ExtensionSettings } from '@/shared/settings';

const form = document.querySelector<HTMLFormElement>('#settings-form')!;
const baseUrlInput = document.querySelector<HTMLInputElement>('#base-url')!;
const apiKeyInput = document.querySelector<HTMLInputElement>('#api-key')!;
const modelInput = document.querySelector<HTMLInputElement>('#model')!;
const targetLangInput = document.querySelector<HTMLInputElement>('#target-lang')!;
const concurrencyInput = document.querySelector<HTMLInputElement>('#concurrency')!;
const saveAlert = document.querySelector<HTMLElement>('#save-alert')!;

function fillForm(settings: ExtensionSettings): void {
  baseUrlInput.value = settings.baseUrl;
  apiKeyInput.value = settings.apiKey;
  modelInput.value = settings.model;
  targetLangInput.value = settings.targetLang;
  concurrencyInput.value = String(settings.concurrency);
}

function readForm(): ExtensionSettings {
  return {
    baseUrl: baseUrlInput.value.trim(),
    apiKey: apiKeyInput.value,
    model: modelInput.value.trim(),
    targetLang: targetLangInput.value.trim(),
    concurrency: Number(concurrencyInput.value),
  };
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await saveSettings(readForm());
    saveAlert.classList.remove('d-none');
    window.setTimeout(() => {
      saveAlert.classList.add('d-none');
    }, 2000);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : String(error));
  }
});

void loadSettings().then(fillForm);
