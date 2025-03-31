'use client';

import { IntlMessages, Locale } from '@boluo/common/locale';
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
import type { ChildrenProps } from '@boluo/utils';
import { LocaleProvider } from './LocaleProvider';
import { backendUrlAtom } from '@boluo/api-browser';
import { PUBLIC_BACKEND_URL } from '../../const';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
}

store.set(backendUrlAtom, (prev): string => {
  if (prev || !PUBLIC_BACKEND_URL) {
    return prev;
  }
  return PUBLIC_BACKEND_URL;
});

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
