import { createIntl, createIntlCache } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { formatStatusMessage } from '@/features/popup/popup-messages';
import { getMessages } from '@/i18n';

describe('formatStatusMessage', () => {
  it('formats the same status message using the current UI locale', () => {
    const message = { id: 'popup.status.idle' } as const;
    const english = createIntl({ locale: 'en', messages: getMessages('en') }, createIntlCache());
    const chinese = createIntl({ locale: 'zh-CN', messages: getMessages('zh-CN') }, createIntlCache());

    expect(formatStatusMessage(english, message)).toBe('Idle');
    expect(formatStatusMessage(chinese, message)).toBe('空闲');
  });
});
