import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { patch } from '../api/browser';
import { identity } from '../helper/function';
import type { Locale } from '../locale';
import { toLocale } from '../locale';
import type { Settings } from '../settings';
import { useMe } from './useMe';

const updateLocale: MutationFetcher<Settings, Locale, string> = async (url: string, { arg: locale }) => {
  const settings: Settings = { locale };
  const settingsResult = await patch('/users/update_settings', null, settings);
  return settingsResult.unwrapOr({});
};

export const useLocale = (): [Locale, (locale: Locale) => void] => {
  const intl = useIntl();
  const me = useMe();
  const locale = toLocale(intl.locale);
  const router = useRouter();
  const { trigger } = useSWRMutation('/users/settings', updateLocale, {
    populateCache: identity,
    revalidate: false,
  });

  const changeLocale = useCallback(
    (locale: Locale) => {
      if (me) {
        void trigger(locale);
      } else {
        document.cookie = `LANG=${locale}; path=/`;
      }
      router.refresh();
    },
    [me, router, trigger],
  );
  return [locale, changeLocale];
};
