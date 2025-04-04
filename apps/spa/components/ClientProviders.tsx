'use client';
import { Provider as JotaiProvider } from 'jotai';
import React, { type ReactNode, useCallback } from 'react';
import { store } from '@boluo/store';
import { SWRConfig, type SWRConfiguration } from 'swr';
import type { IntlMessages, Locale } from '@boluo/common/locale';
import { IntlProvider, type ResolvedIntlConfig, ReactIntlErrorCode } from 'react-intl';
import { ChangeLocaleContext } from '@boluo/common/hooks';
import { recordWarn } from '../error';
import { isApiError } from '@boluo/api';
import { captureException } from '@sentry/nextjs';
import { backendUrlAtom } from '@boluo/api-browser';
import { PUBLIC_BACKEND_URL } from '../const';

interface Props {
  lang: Locale;
  children: ReactNode;
  messages: IntlMessages;
}

const onError = (error: unknown, key: unknown) => {
  if (isApiError(error)) {
    switch (error.code) {
      case 'UNAUTHENTICATED':
      case 'NOT_FOUND':
      case 'NO_PERMISSION':
      case 'NOT_JSON':
      case 'FETCH_FAIL':
        return;
    }
  }
  captureException(error, { extra: { key } });
};

const swrConfig: SWRConfiguration = {
  refreshInterval: 60000,
  onError,
};

store.set(backendUrlAtom, (prev): string => {
  if (prev || !PUBLIC_BACKEND_URL) {
    return prev;
  }
  return PUBLIC_BACKEND_URL;
});

export function ClientProviders({ children, lang, messages }: Props) {
  const changeLocale = useCallback((locale: Locale) => {
    location.href = `/${locale}${location.hash}`;
  }, []);
  const handleIntlError: ResolvedIntlConfig['onError'] = useCallback((err) => {
    if (err.code === ReactIntlErrorCode.MISSING_TRANSLATION) {
      return;
    }
    recordWarn('IntlError', { error: err });
  }, []);

  return (
    <JotaiProvider store={store}>
      <SWRConfig value={swrConfig}>
        <ChangeLocaleContext value={changeLocale}>
          <IntlProvider locale={lang} messages={messages} onError={handleIntlError}>
            {children}
          </IntlProvider>
        </ChangeLocaleContext>
      </SWRConfig>
    </JotaiProvider>
  );
}
