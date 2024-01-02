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

  const key = ['/users/settings'] as const;
  const updater: MutationFetcher<Settings, Theme, typeof key> = useCallback(async (url, { arg: theme }) => {
    const settings: Settings = { theme };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.unwrapOr({});
  }, []);
  const { trigger } = useSWRMutation(key, updater, {
    populateCache: identity,
    revalidate: false,
  });

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const value = event.target.value;
    const theme = setThemeToDom(value);
    document.cookie = `boluo-theme=${theme}; path=/;max-age=31536000`;
    if (me && me !== 'LOADING') {
      void trigger(theme);
    }
  };

  const items = useMemo(() => [
    { value: 'system', label: intl.formatMessage({ defaultMessage: 'Follow System' }) },
    { value: 'light', label: intl.formatMessage({ defaultMessage: 'Light' }) },
    { value: 'dark', label: intl.formatMessage({ defaultMessage: 'Dark' }) },
  ], [intl]);
  return (
    <Select value={theme} onChange={handleChange} id={id}>
      {items.map(item => <option value={item.value}>{item.label}</option>)}
    </Select>
  );
};
