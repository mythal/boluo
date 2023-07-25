'use client';
import { patch } from 'api-browser';
import { Settings, useMe } from 'common';
import { FC, useCallback } from 'react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { setThemeToDom, Theme } from 'theme';
import { useTheme } from 'theme/useTheme';
import { Select } from 'ui/Select';
import { identity } from 'utils';

interface Props {
  id?: string;
}

export const ThemeSelect: FC<Props> = ({ id }) => {
  const me = useMe();
  const theme = useTheme();
  const intl = useIntl();

  const updater: MutationFetcher<Settings, string, Theme> = useCallback(async (url: string, { arg: theme }) => {
    const settings: Settings = { theme };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.unwrapOr({});
  }, []);
  const { trigger } = useSWRMutation('/users/settings', updater, {
    populateCache: identity,
    revalidate: false,
  });

  const handleChange = (value: string) => {
    const theme = setThemeToDom(value);
    if (me) {
      void trigger(theme);
    } else {
      document.cookie = `BOLUO_THEME=${theme}; path=/`;
    }
  };

  const items = useMemo(() => [
    { value: 'system', label: intl.formatMessage({ defaultMessage: 'Follow System' }) },
    { value: 'light', label: intl.formatMessage({ defaultMessage: 'Light' }) },
    { value: 'dark', label: intl.formatMessage({ defaultMessage: 'Dark' }) },
  ], [intl]);
  return <Select items={items} value={theme} onChange={handleChange} id={id} />;
};
