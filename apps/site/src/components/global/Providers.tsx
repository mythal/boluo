'use client';

import type { OnErrorFn } from '@formatjs/intl';
import type { GetMe } from 'api';
import { Provider as JotaiProvider } from 'jotai';
import type { FC } from 'react';
import { useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import { SWRConfig } from 'swr';
import { clearWatchSystemTheme, watchSystemTheme } from 'ui/theme';
import type { ChildrenProps } from 'utils';
import { MeProvider } from '../../hooks/useMe';
import type { IntlMessages, Locale } from '../../locale';
import { defaultLocale } from '../../locale';
import { store } from '../../state/store';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
  me: GetMe | null;
}

const onIntlError: OnErrorFn = (e) => {
  if (e.code === 'MISSING_TRANSLATION') {
    if (typeof window === 'undefined' /* SSR */) {
      // do noting
    } else {
      console.debug('Missing Translation: ', e.message);
    }
  } else {
    throw e;
  }
};

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
        <IntlProvider locale={locale} messages={messages} defaultLocale={defaultLocale} onError={onIntlError}>
          <MeProvider initialMe={me}>
            {children}
          </MeProvider>
        </IntlProvider>
      </SWRConfig>
    </JotaiProvider>
  );
};
