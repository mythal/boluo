import type { FC } from 'react';
import type { MutationFetcher } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';
import { Switch } from 'ui';
import { patch } from '../../../api/browser';
import { identity } from '../../../helper/function';
import { useSettings } from '../../../hooks/useSettings';
import type { Settings } from '../../../settings';
import { toSettings } from '../../../settings';

interface Props {
}
const updater: MutationFetcher<Settings, boolean, string> = async (url: string, { arg: enterSend }) => {
  const settings: Settings = { enterSend };
  const settingsResult = await patch('/users/update_settings', null, settings);
  return settingsResult.map(toSettings).unwrapOr({});
};
export const EnterSendSwitch: FC<Props> = () => {
  const { trigger, isMutating } = useSWRMutation('/users/settings', updater, {
    populateCache: identity,
    revalidate: false,
  });
  const { enterSend = false } = useSettings();
  const handleChange = (enterSend: boolean) => trigger(enterSend);
  return <Switch disabled={isMutating} checked={enterSend} onChange={handleChange} />;
};
