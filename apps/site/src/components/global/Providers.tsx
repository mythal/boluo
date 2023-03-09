'use client';

import type { GetMe } from 'api';
import { MeProvider } from 'common';
import { IntlMessages, Locale } from 'common/locale';
import { store } from 'common/store';
import { Provider as JotaiProvider } from 'jotai';
import type { FC } from 'react';
import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import { clearWatchSystemTheme, watchSystemTheme } from 'ui/theme';
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
          suspense: true,
        }}
      >
        <MeProvider initialMe={me}>
          <LocaleProvider locale={locale} messages={messages}>
            {children}
          </LocaleProvider>
        </MeProvider>
      </SWRConfig>
    </JotaiProvider>
  );
};
