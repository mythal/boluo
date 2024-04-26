'use client';
import { Provider as JotaiProvider } from 'jotai';
import { ReactNode } from 'react';
import { store } from '@boluo/store';
import { SWRConfig } from 'swr';
import type { IntlMessages, Locale } from '@boluo/common/locale';
import { IntlProvider } from 'react-intl';

interface Props {
  lang: Locale;
  children: ReactNode;
  messages: IntlMessages;
}

export function ClientProviders({ children, lang, messages }: Props) {
  return (
    <JotaiProvider store={store}>
      <SWRConfig
        value={{
          refreshInterval: 60000,
        }}
      >
        <IntlProvider locale={lang} messages={messages}>
          {children}
        </IntlProvider>
      </SWRConfig>
    </JotaiProvider>
  );
}
