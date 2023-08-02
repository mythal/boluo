'use client';

import type { GetMe } from 'api';
import { IntlMessages, Locale } from 'common/locale';
import { Provider as JotaiProvider } from 'jotai';
import type { FC } from 'react';
import { useEffect } from 'react';
import { store } from 'store';
import { SWRConfig } from 'swr';
import { clearWatchSystemTheme, watchSystemTheme } from 'theme';
import type { ChildrenProps } from 'utils';
import { LocaleProvider } from './LocaleProvider';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
  me: GetMe | null;
}

export const ClientProviders: FC<Props> = ({ children, locale, messages, me }) => {
  useEffect(() => {
    watchSystemTheme();
    return clearWatchSystemTheme;
  }, []);

  return (
    <JotaiProvider store={store}>
      <SWRConfig
        value={{
          refreshInterval: 60000,
        }}
      >
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </SWRConfig>
    </JotaiProvider>
  );
};
