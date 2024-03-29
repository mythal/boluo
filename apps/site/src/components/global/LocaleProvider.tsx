'use client';
import { patch } from 'api-browser';
import { Locale, Settings, useMe } from 'common';
import { ChangeLocaleContext } from 'common/hooks/useLocale';
import { defaultLocale, IntlMessages, localeList, onIntlError } from 'common/locale';
import { usePathname, useRouter } from 'next/navigation';
import { FC, useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { ChildrenProps, identity } from 'utils';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
}

const removeLocalePrefix = (pathname: string) => {
  for (const locale of localeList) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.replace(`/${locale}`, '');
    }
  }
  return pathname;
};

export const LocaleProvider: FC<Props> = ({ children, locale, messages }) => {
  const me = useMe();
  const router = useRouter();

  const key = ['/users/settings'] as const;
  const localeUpdater: MutationFetcher<Settings, Locale, typeof key> = useCallback(async (_, { arg: locale }) => {
    const settings: Settings = { locale };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.unwrapOr({});
  }, []);
  const { trigger: updateLocale } = useSWRMutation(key, localeUpdater, {
    populateCache: identity,
    revalidate: false,
  });

  const handleChangeLocale = useCallback(
    (locale: Locale) => {
      if (me) {
        void updateLocale(locale);
      }
      document.cookie = `boluo-locale=${locale}; path=/;max-age=31536000`;
      router.refresh();
    },
    [me, router, updateLocale],
  );
  return (
    <IntlProvider locale={locale} messages={messages} defaultLocale={defaultLocale} onError={onIntlError}>
      <ChangeLocaleContext.Provider value={handleChangeLocale}>{children}</ChangeLocaleContext.Provider>
    </IntlProvider>
  );
};
