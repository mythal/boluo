'use client';
import { patch } from '@boluo/api-browser';
import { Locale, Settings, useQueryCurrentUser } from '@boluo/common';
import { ChangeLocaleContext } from '@boluo/common/hooks';
import { defaultLocale, IntlMessages, LOCALES, onIntlError } from '@boluo/common/locale';
import { useRouter } from 'next/navigation';
import { FC, useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { ChildrenProps, identity } from '@boluo/utils';

interface Props extends ChildrenProps {
  locale: Locale;
  messages: IntlMessages;
}

export const LocaleProvider: FC<Props> = ({ children, locale, messages }) => {
  const { data: currentUser } = useQueryCurrentUser();
  const router = useRouter();

  const key = ['/users/settings'] as const;
  const localeUpdater: MutationFetcher<Settings, typeof key, Locale> = useCallback(
    async (_, { arg: locale }) => {
      const settings: Settings = { locale };
      const settingsResult = await patch('/users/update_settings', null, settings);
      return settingsResult.unwrapOr({});
    },
    [],
  );
  const { trigger: updateLocale } = useSWRMutation(key, localeUpdater, {
    populateCache: identity,
    revalidate: false,
  });

  const handleChangeLocale = useCallback(
    (locale: Locale) => {
      if (currentUser != null) {
        void updateLocale(locale);
      }
      document.cookie = `boluo-locale=${locale}; path=/;max-age=31536000`;
      router.refresh();
    },
    [currentUser, router, updateLocale],
  );
  return (
    <IntlProvider
      locale={locale}
      messages={messages}
      defaultLocale={defaultLocale}
      onError={onIntlError}
    >
      <ChangeLocaleContext value={handleChangeLocale}>{children}</ChangeLocaleContext>
    </IntlProvider>
  );
};
