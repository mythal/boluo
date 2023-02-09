'use client';
import type { FC } from 'react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import type { Theme } from 'ui';
import { Select, setThemeToDom, useTheme } from 'ui';
import { patch } from '../../../api/browser';
import { identity } from '../../../helper/function';
import { useMe } from '../../../hooks/useMe';
import type { Settings } from '../../../settings';

interface Props {
  id?: string;
}

const updater: MutationFetcher<Settings, Theme, string> = async (url: string, { arg: theme }) => {
  const settings: Settings = { theme };
  const settingsResult = await patch('/users/update_settings', null, settings);
  return settingsResult.unwrapOr({});
};

export const ThemeSelect: FC<Props> = ({ id }) => {
  const me = useMe();
  const theme = useTheme();
  const intl = useIntl();
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
