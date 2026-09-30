import { DEFAULT_LOCALE, getMessages } from '@/i18n';

export const API_KEY_MISSING_MESSAGE = getMessages(DEFAULT_LOCALE)['popup.apiKeyMissing'];

export type ApiKeyEnv = {
  DEV?: boolean;
  MODE?: string;
  VITE_DEV_API_KEY?: string;
};

export function hasApiKey(settings: { apiKey: string }): boolean {
  return settings.apiKey.trim().length > 0;
}

export function resolveDefaultApiKey(
  env: ApiKeyEnv = import.meta.env,
): string {
  const isDev = env.DEV === true || env.MODE === 'development';
  if (!isDev) {
    return '';
  }
  const raw = env.VITE_DEV_API_KEY;
  return typeof raw === 'string' ? raw.trim() : '';
}
