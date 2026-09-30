import en from '@/i18n/messages/en.json';
import zhCN from '@/i18n/messages/zh-CN.json';

export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_SETTINGS = ['auto', ...SUPPORTED_LOCALES] as const;

export type LocaleSetting = (typeof LOCALE_SETTINGS)[number];

export const DEFAULT_LOCALE_SETTING: LocaleSetting = 'auto';

export type MessageId = keyof typeof en;
export type Messages = Record<string, string>;
export type MessageValues = Record<string, string | number>;

const MESSAGES: Record<Locale, Messages> = {
  en,
  'zh-CN': zhCN,
};

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

export function isLocaleSetting(value: unknown): value is LocaleSetting {
  return typeof value === 'string'
    && (LOCALE_SETTINGS as readonly string[]).includes(value);
}

export function resolveLocaleSetting(value: unknown): LocaleSetting {
  if (isLocaleSetting(value)) {
    return value;
  }
  const fromEnv = import.meta.env.VITE_DEFAULT_UI_LOCALE;
  return isLocaleSetting(fromEnv) ? fromEnv : DEFAULT_LOCALE_SETTING;
}

export function resolveLocale(raw?: string | null): Locale {
  const value = (raw ?? '').trim().toLowerCase();
  if (value.startsWith('zh')) {
    return 'zh-CN';
  }
  if (value.startsWith('en')) {
    return 'en';
  }
  return DEFAULT_LOCALE;
}

function browserLanguage(): string | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  return navigator.language || navigator.languages?.[0];
}

export function resolveUiLocale(
  setting: LocaleSetting = DEFAULT_LOCALE_SETTING,
  language: string | undefined = browserLanguage(),
): Locale {
  if (setting === 'en' || setting === 'zh-CN') {
    return setting;
  }
  return resolveLocale(language);
}

export function detectLocale(): Locale {
  return resolveUiLocale(DEFAULT_LOCALE_SETTING);
}

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

/**
 * Minimal message lookup for non-React code (content/background). Complex ICU
 * messages (plurals) are formatted by react-intl inside React trees.
 */
export function formatMessage(
  locale: Locale,
  id: MessageId,
  values: MessageValues = {},
): string {
  const template = getMessages(locale)[id] ?? getMessages(DEFAULT_LOCALE)[id] ?? id;
  return template.replace(PLACEHOLDER_PATTERN, (match, name: string) => (
    name in values ? String(values[name]) : match
  ));
}
