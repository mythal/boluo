'use client';

import type { IntlMessages } from '@boluo/locale';
import { Provider as JotaiProvider } from 'jotai';
import { FC, useEffect } from 'react';
import { store } from '@boluo/store';
import { SWRConfig } from 'swr';
import {
  clearWatchSystemTheme,
  getThemeFromCookie,
  setThemeToDom,
  watchSystemTheme,
} from '@boluo/theme';
import type { ChildrenProps, Locale } from '@boluo/types';
import { LocaleProvider } from './LocaleProvider';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
}

export const ClientProviders: FC<Props> = ({ children, locale, messages }) => {
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
