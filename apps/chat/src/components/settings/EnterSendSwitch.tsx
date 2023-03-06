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
export const EnterSendSwitch: FC<Props> = () => {
  const patch = usePatch();
  const updater: MutationFetcher<Settings, boolean, string> = useCallback(async (url: string, { arg: enterSend }) => {
    const settings: Settings = { enterSend };
    const settingsResult = await patch('/users/update_settings', null, settings);
    return settingsResult.map(toSettings).unwrapOr({});
  }, [patch]);
  const { trigger, isMutating } = useSWRMutation('/users/settings', updater, {
    populateCache: identity,
    revalidate: false,
  });
  const { enterSend = false } = useSettings();
  const handleChange = (enterSend: boolean) => trigger(enterSend);
  return <Switch disabled={isMutating} checked={enterSend} onChange={handleChange} />;
};
