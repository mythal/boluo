'use client';
import { setConfiguration } from '@boluo/chat/configuration';
import { makeMeidaPublicUrl } from '@boluo/chat/media';
import { localeAtom, messagesAtom } from '@boluo/chat/state/locale';
import { Locale } from '@boluo/common';
import { ChangeLocaleContext } from '@boluo/common/hooks/useLocale';
import { onIntlError } from '@boluo/common/locale';
import { useAtom, useAtomValue } from 'jotai';
import { FC, useCallback, useEffect, useTransition } from 'react';
import { IntlProvider } from 'react-intl';
import { ChildrenProps } from '@boluo/utils';

setConfiguration({
  app: 'spa',
  development: process.env.NODE_ENV === 'development',
  mediaUrl: makeMeidaPublicUrl(process.env.PUBLIC_MEDIA_URL),
});

export const LocaleProvider: FC<ChildrenProps> = ({ children }) => {
  const [locale, setLocale] = useAtom(localeAtom);
  const messages = useAtomValue(messagesAtom);
  const [, startTransition] = useTransition();
  const changeLocale = useCallback(
    (locale: Locale) => {
      startTransition(() => setLocale(locale));
    },
    [setLocale],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <IntlProvider locale={locale} onError={onIntlError} messages={messages.default}>
      <ChangeLocaleContext.Provider value={changeLocale}>{children}</ChangeLocaleContext.Provider>
    </IntlProvider>
  );
};
