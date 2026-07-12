export const API_KEY_MISSING_MESSAGE =
  'API key is missing. Configure it in extension options.';

export function hasApiKey(settings: { apiKey: string }): boolean {
  return settings.apiKey.trim().length > 0;
}
