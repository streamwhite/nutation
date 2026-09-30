import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { DEFAULT_LOCALE, getMessages } from '@/i18n';
import { useUiLocale } from '@/i18n/use-ui-locale';

type IntlRootProps = {
  children: ReactNode;
};

export function IntlRoot({ children }: IntlRootProps) {
  const locale = useUiLocale();

  return (
    <IntlProvider
      locale={locale}
      defaultLocale={DEFAULT_LOCALE}
      messages={getMessages(locale)}
      onError={() => undefined}
    >
      {children}
    </IntlProvider>
  );
}
