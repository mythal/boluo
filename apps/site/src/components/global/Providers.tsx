'use client';

import type { GetMe } from '@boluo/api';
import { IntlMessages, Locale } from '@boluo/common/locale';
import { Provider as JotaiProvider } from 'jotai';
import { FC, useEffect } from 'react';
import { store } from '@boluo/store';
import { SWRConfig } from 'swr';
import { clearWatchSystemTheme, getThemeFromCookie, setThemeToDom, watchSystemTheme } from '@boluo/theme';
import type { ChildrenProps } from '@boluo/utils';
import { LocaleProvider } from './LocaleProvider';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
  me: GetMe | null;
}

export const ClientProviders: FC<Props> = ({ children, locale, messages, me }) => {
  useEffect(() => {
    const theme = getThemeFromCookie();
    if (theme != null) {
      setThemeToDom(theme);
    }
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
