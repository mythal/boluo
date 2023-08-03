'use client';

import type { GetMe } from 'api';
import { Configuration, ConfigurationContext } from 'chat/configuration';
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

const getMediaPublicUrl = () => {
  const url = process.env.PUBLIC_MEDIA_URL;
  if (url == null) {
    throw new Error('PUBLIC_MEDIA_URL is not defined');
  }
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
};

const configuration: Configuration = {
  app: 'site',
  mediaPublicUrl: getMediaPublicUrl(),
  development: process.env.NODE_ENV === 'development',
};

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
    <ConfigurationContext.Provider
      value={configuration}
    >
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
    </ConfigurationContext.Provider>
  );
};
