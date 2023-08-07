'use client';

import type { GetMe } from 'api';
import { setConfiguration } from 'chat/configuration';
import { makeMeidaPublicUrl } from 'chat/media';
import { IntlMessages, Locale } from 'common/locale';
import { Provider as JotaiProvider } from 'jotai';
import { FC, useEffect } from 'react';
import { store } from 'store';
import { SWRConfig } from 'swr';
import { clearWatchSystemTheme, getThemeFromCookie, setThemeToDom, watchSystemTheme } from 'theme';
import type { ChildrenProps } from 'utils';
import { LocaleProvider } from './LocaleProvider';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
  me: GetMe | null;
}

setConfiguration({
  app: 'site',
  development: process.env.NODE_ENV === 'development',
  mediaUrl: makeMeidaPublicUrl(process.env.PUBLIC_MEDIA_URL),
});

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
