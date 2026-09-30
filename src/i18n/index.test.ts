import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  DEFAULT_LOCALE_SETTING,
  detectLocale,
  formatMessage,
  getMessages,
  resolveLocale,
  resolveLocaleSetting,
  resolveUiLocale,
} from '@/i18n';

describe('resolveLocale', () => {
  it('maps Chinese browser locales to zh-CN', () => {
    expect(resolveLocale('zh-CN')).toBe('zh-CN');
    expect(resolveLocale('zh-TW')).toBe('zh-CN');
    expect(resolveLocale('zh-Hans')).toBe('zh-CN');
  });

  it('maps English browser locales to en', () => {
    expect(resolveLocale('en-US')).toBe('en');
  });

  it('falls back to the default locale', () => {
    expect(resolveLocale('de-DE')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });
});

describe('resolveLocaleSetting', () => {
  it('accepts supported settings', () => {
    expect(resolveLocaleSetting('auto')).toBe('auto');
    expect(resolveLocaleSetting('en')).toBe('en');
    expect(resolveLocaleSetting('zh-CN')).toBe('zh-CN');
  });

  it('falls back to auto for invalid input', () => {
    expect(resolveLocaleSetting('fr')).toBe(DEFAULT_LOCALE_SETTING);
    expect(resolveLocaleSetting(undefined)).toBe(DEFAULT_LOCALE_SETTING);
  });
});

describe('resolveUiLocale', () => {
  it('uses the explicit locale regardless of the browser language', () => {
    expect(resolveUiLocale('en', 'zh-CN')).toBe('en');
    expect(resolveUiLocale('zh-CN', 'en-US')).toBe('zh-CN');
  });

  it('follows the browser language when set to auto', () => {
    expect(resolveUiLocale('auto', 'zh-TW')).toBe('zh-CN');
    expect(resolveUiLocale('auto', 'en-GB')).toBe('en');
    expect(resolveUiLocale('auto', 'de-DE')).toBe(DEFAULT_LOCALE);
  });
});

describe('detectLocale', () => {
  it('detects from the browser language', () => {
    expect(detectLocale()).toBe(resolveLocale(navigator.language));
  });
});

describe('message catalogs', () => {
  it('ships every English id in the Chinese catalog', () => {
    const englishIds = Object.keys(getMessages('en')).sort();
    const chineseIds = Object.keys(getMessages('zh-CN')).sort();
    expect(chineseIds).toEqual(englishIds);
  });
});

describe('formatMessage', () => {
  it('interpolates named values', () => {
    expect(formatMessage('en', 'popup.startedTabs', { started: 2, total: 3 })).toBe(
      'Started 2/3 tabs.',
    );
    expect(formatMessage('zh-CN', 'popup.startedTabs', { started: 2, total: 3 })).toBe(
      '已开始 2/3 个标签页。',
    );
  });

  it('keeps unknown placeholders untouched', () => {
    expect(formatMessage('en', 'popup.contentScriptUnavailable')).toContain('{detail}');
  });
});

describe('ICU plural catalogs', () => {
  it('formats plural counts with react-intl', () => {
    const en = createIntl({ locale: 'en', messages: getMessages('en') });
    const zh = createIntl({ locale: 'zh-CN', messages: getMessages('zh-CN') });
    expect(en.formatMessage({ id: 'popup.translateLabel' }, { count: 1 })).toBe('Translate page');
    expect(en.formatMessage({ id: 'popup.translateLabel' }, { count: 3 })).toBe('Translate 3 tabs');
    expect(zh.formatMessage({ id: 'popup.translateLabel' }, { count: 3 })).toBe('翻译 3 个标签页');
  });
});
