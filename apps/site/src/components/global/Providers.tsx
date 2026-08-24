'use client';

import type { IntlMessages } from '@boluo/locale';
import { Provider as JotaiProvider } from 'jotai';
import { type FC, useEffect } from 'react';
import { store } from '@boluo/store';
import { SWRConfig, type SWRConfiguration } from 'swr';
import {
  clearWatchSystemTheme,
  getThemeFromCookie,
  setThemeToDom,
  watchSystemTheme,
} from '@boluo/theme';
import type { ChildrenProps, Locale } from '@boluo/types';
import { LocaleProvider } from './LocaleProvider';
import { reportApiError } from '../../error';
import { isApiError } from '@boluo/api';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
}

const nonRetryableApiErrorCodes = new Set([
  'UNAUTHENTICATED',
  'NO_PERMISSION',
  'NOT_FOUND',
  'BAD_REQUEST',
  'VALIDATION_FAIL',
  'CONFLICT',
  'METHOD_NOT_ALLOWED',
  'LIMIT_EXCEEDED',
]);

const requestPathFromKey = (key: unknown): string => {
  if (typeof key === 'string') return key;
  if (Array.isArray(key) && typeof key[0] === 'string') return key[0];
  return 'unknown';
};

const onError: NonNullable<SWRConfiguration['onError']> = (error: unknown, key: unknown) => {
  reportApiError(error, { requestPath: requestPathFromKey(key), source: 'swr' });
};

const swrConfiguration: SWRConfiguration = {
  refreshInterval: 60000,
  onError,
  shouldRetryOnError: (error: unknown) =>
    !isApiError(error) || !nonRetryableApiErrorCodes.has(error.code),
};

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
      <SWRConfig value={swrConfiguration}>
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </SWRConfig>
    </JotaiProvider>
  );
};
