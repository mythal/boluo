'use client';
import { patch } from '@boluo/api-browser';
import { Settings, useQueryUser } from '@boluo/common';
import { FC, useCallback } from 'react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { setThemeToDom, Theme } from '@boluo/theme';
import { useTheme } from '@boluo/theme/useTheme';
import { Select } from '@boluo/ui/Select';
import { identity } from '@boluo/utils';

interface Props {
  id?: string;
}

export const ThemeSelect: FC<Props> = ({ id }) => {
  const theme = useTheme();
  const { data: currentUser } = useQueryUser();
  const intl = useIntl();

  const key = ['/users/settings'] as const;
  const updater: MutationFetcher<Settings, typeof key, Theme> = useCallback(async (url, { arg: theme }) => {
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
    if (currentUser) {
      void trigger(theme);
    }
  };

  const items = useMemo(
    () => [
      { value: 'system', label: intl.formatMessage({ defaultMessage: 'Follow System' }) },
      { value: 'light', label: intl.formatMessage({ defaultMessage: 'Light' }) },
      { value: 'dark', label: intl.formatMessage({ defaultMessage: 'Dark' }) },
    ],
    [intl],
  );
  return (
    <Select value={theme} onChange={handleChange} id={id}>
      {items.map((item, key) => (
        <option key={key} value={item.value}>
          {item.label}
        </option>
      ))}
    </Select>
  );
};
