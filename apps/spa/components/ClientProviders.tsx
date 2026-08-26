'use client';
import { Provider as JotaiProvider } from 'jotai';
import React, { type ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { store } from '@boluo/store';
import { SWRConfig, type SWRConfiguration } from 'swr';
import type { IntlMessages } from '@boluo/locale';
import { IntlProvider, type ResolvedIntlConfig, ReactIntlErrorCode } from 'react-intl';
import { ChangeLocaleContext } from '@boluo/hooks/useLocale';
import { recordWarn } from '../error';
import { isApiError } from '@boluo/api';
import type { Locale } from '@boluo/types';
import { reportSwrError } from '../swr-error';

interface Props {
  lang: Locale;
  children: ReactNode;
  messages: IntlMessages;
}

const expectedApiErrorCodes = new Set(['UNAUTHENTICATED', 'NOT_FOUND', 'NO_PERMISSION']);

const swrConfig: SWRConfiguration = {
  refreshInterval: 60000,
  onError: reportSwrError,
  shouldRetryOnError: (error: unknown) =>
    !isApiError(error) || !expectedApiErrorCodes.has(error.code),
};

export function ClientProviders({ children, lang, messages }: Props) {
  const router = useRouter();
  const changeLocale = useCallback(
    (locale: Locale) => {
      router.push(`/${locale}${location.hash}`);
    },
    [router],
  );
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
