'use client';
import { patch } from 'api-browser';
import { Locale, Settings, useMe } from 'common';
import { ChangeLocaleContext } from 'common/hooks/useLocale';
import { defaultLocale, IntlMessages, onIntlError } from 'common/locale';
import { useRouter } from 'next/navigation';
import { FC, useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { ChildrenProps, identity } from 'utils';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
}

export const LocaleProvider: FC<Props> = ({ children, locale, messages }) => {
  const me = useMe();
  const router = useRouter();

  const updateLocale: MutationFetcher<Settings, string, Locale> = useCallback(async (url: string, { arg: locale }) => {
    const settings: Settings = { locale };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.unwrapOr({});
  }, []);
  const { trigger } = useSWRMutation('/users/settings', updateLocale, {
    populateCache: identity,
    revalidate: false,
  });

  const handleChangeLocale = useCallback((locale: Locale) => {
    if (me) {
      void trigger(locale);
    }
    document.cookie = `LANG=${locale}; path=/`;
    router.refresh();
  }, [me, router, trigger]);
  return (
    <IntlProvider locale={locale} messages={messages} defaultLocale={defaultLocale} onError={onIntlError}>
      <ChangeLocaleContext.Provider value={handleChangeLocale}>
        {children}
      </ChangeLocaleContext.Provider>
    </IntlProvider>
  );
};
