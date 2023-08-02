import { Configuration, ConfigurationContext } from 'chat/configuration';
import { localeAtom, messagesAtom } from 'chat/state/locale';
import { Locale } from 'common';
import { ChangeLocaleContext } from 'common/hooks/useLocale';
import { onIntlError } from 'common/locale';
import { useAtom, useAtomValue } from 'jotai';
import { FC, useCallback, useEffect, useTransition } from 'react';
import { IntlProvider } from 'react-intl';
import { ChildrenProps } from 'utils';

const getMediaPublicUrl = () => {
  const url = import.meta.env.PUBLIC_MEDIA_URL;
  if (url == null) {
    throw new Error('PUBLIC_MEDIA_URL is not defined');
  }
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
};

const configuration: Configuration = {
  app: 'spa',
  mediaPublicUrl: getMediaPublicUrl(),
  development: import.meta.env.DEV,
};

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
    <ConfigurationContext.Provider value={configuration}>
      <IntlProvider locale={locale} onError={onIntlError} messages={messages.default}>
        <ChangeLocaleContext.Provider value={changeLocale}>
          {children}
        </ChangeLocaleContext.Provider>
      </IntlProvider>
    </ConfigurationContext.Provider>
  );
};
