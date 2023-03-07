import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { identity } from 'utils';
import { Locale, toLocale } from './locale';
import type { Settings } from './settings';
import { useMe } from './useMe';
import { usePatch } from './usePatch';

export const useLocale = (): [Locale, (locale: Locale) => void] => {
  const intl = useIntl();
  const me = useMe();
  const locale = toLocale(intl.locale);
  const patch = usePatch();

  const updateLocale: MutationFetcher<Settings, Locale, string> = useCallback(async (url: string, { arg: locale }) => {
    const settings: Settings = { locale };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.unwrapOr({});
  }, [patch]);
  const { trigger } = useSWRMutation('/users/settings', updateLocale, {
    populateCache: identity,
    revalidate: false,
  });

  const changeLocale = useCallback(
    (locale: Locale, callback?: () => void) => {
      if (me) {
        void trigger(locale);
      } else {
        document.cookie = `LANG=${locale}; path=/`;
      }
      callback?.();
    },
    [me, trigger],
  );
  return [locale, changeLocale];
};
