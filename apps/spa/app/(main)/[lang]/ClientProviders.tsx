'use client';
import { Provider as JotaiProvider } from 'jotai';
import { ReactNode, useCallback } from 'react';
import { store } from '@boluo/store';
import { SWRConfig } from 'swr';
import type { IntlMessages, Locale } from '@boluo/common/locale';
import { IntlProvider } from 'react-intl';
import { ChangeLocaleContext } from '@boluo/common/hooks/useLocale';

interface Props {
  lang: Locale;
  children: ReactNode;
  messages: IntlMessages;
}

export function ClientProviders({ children, lang, messages }: Props) {
  const changeLocale = useCallback((locale: Locale) => {
    location.href = `/${locale}${location.hash}`;
  }, []);

  return (
    <JotaiProvider store={store}>
      <SWRConfig
        value={{
          refreshInterval: 60000,
        }}
      >
        <ChangeLocaleContext.Provider value={changeLocale}>
          <IntlProvider locale={lang} messages={messages}>
            {children}
          </IntlProvider>
        </ChangeLocaleContext.Provider>
      </SWRConfig>
    </JotaiProvider>
  );
}
