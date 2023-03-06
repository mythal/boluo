import { Settings, usePatch } from 'common';
import { toSettings } from 'common/settings';
import { FC, useCallback } from 'react';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { Switch } from 'ui';
import { identity } from 'utils';
import { useSettings } from '../../hooks/useSettings';

interface Props {
}
export const ExpandDiceSwitch: FC<Props> = () => {
  const patch = usePatch();

  const updater: MutationFetcher<Settings, boolean, string> = useCallback(async (url: string, { arg: expandDice }) => {
    const settings: Settings = { expandDice };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.map(toSettings).unwrapOr({});
  }, [patch]);
  const { trigger, isMutating } = useSWRMutation('/users/settings', updater, {
    populateCache: identity,
    revalidate: false,
  });
  const { expandDice = false } = useSettings();
  const handleChange = (expandDice: boolean) => trigger(expandDice);
  return <Switch disabled={isMutating} checked={expandDice} onChange={handleChange} />;
};
