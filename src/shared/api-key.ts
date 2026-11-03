import { DEFAULT_LOCALE, getMessages } from '@/i18n';

export const API_KEY_MISSING_MESSAGE = getMessages(DEFAULT_LOCALE)['popup.apiKeyMissing'];

export function hasApiKey(settings: { apiKey: string }): boolean {
  return settings.apiKey.trim().length > 0;
}
