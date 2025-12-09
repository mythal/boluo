'use client';
import { patch } from '@boluo/api-browser';
import { useQueryCurrentUser } from '@boluo/common/hooks/useQueryCurrentUser';
import { type FC, useCallback } from 'react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { setThemeToDom, type Theme, writeThemeToCookie } from '@boluo/theme';
import { useTheme } from '@boluo/theme/react';
import type { Settings } from '@boluo/settings';
import { Select } from '@boluo/ui/Select';
import { identity } from '@boluo/utils/function';

interface Props {
  id?: string;
}

export const ThemeSelect: FC<Props> = ({ id }) => {
  const theme = useTheme();
  const { data: currentUser } = useQueryCurrentUser();
  const intl = useIntl();

  const key = ['/users/settings'] as const;
  const updater: MutationFetcher<Settings, typeof key, Theme> = useCallback(
    async (url, { arg: theme }) => {
      const settings: Settings = { theme };
      const settingsResult = await patch('/users/update_settings', null, settings);
      return settingsResult.unwrapOr({});
    },
    [],
  );
  const { trigger } = useSWRMutation(key, updater, {
    populateCache: identity,
    revalidate: false,
  });

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const value = event.target.value;
    const theme = setThemeToDom(value);
    writeThemeToCookie(theme);
    if (currentUser) {
      void trigger(theme);
    }
  };

  const items = useMemo(
    () => [
      { value: 'system', label: intl.formatMessage({ defaultMessage: 'Follow System' }) },
      { value: 'light', label: intl.formatMessage({ defaultMessage: 'Light' }) },
      { value: 'dark', label: intl.formatMessage({ defaultMessage: 'Midnight' }) },
      { value: 'graphite', label: intl.formatMessage({ defaultMessage: 'Graphite' }) },
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
