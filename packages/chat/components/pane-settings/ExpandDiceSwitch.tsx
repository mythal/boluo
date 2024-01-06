import { patch } from 'api-browser';
import { Settings } from 'common';
import { toSettings } from 'common/settings';
import { FC, useCallback } from 'react';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { Button } from 'ui/Button';
import { identity } from 'utils';
import { useQuerySettings } from '../../hooks/useQuerySettings';

interface Props {}

export const ExpandDiceSwitch: FC<Props> = () => {
  const key = ['/users/settings'] as const;
  const updater: MutationFetcher<Settings, boolean, typeof key> = useCallback(async (url, { arg: expandDice }) => {
    const settings: Settings = { expandDice };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.map(toSettings).unwrapOr({});
  }, []);
  const { trigger, isMutating } = useSWRMutation(key, updater, {
    populateCache: identity,
    revalidate: false,
  });
  const { data: settings } = useQuerySettings();
  const expandDice = settings?.expandDice ?? false;
  const toggle = () => trigger(!expandDice);
  return (
    <Button disabled={isMutating} data-type="switch" data-on={expandDice} onClick={toggle}>
      Enable
    </Button>
  );
};
