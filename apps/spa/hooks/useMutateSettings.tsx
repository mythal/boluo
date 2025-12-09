import { patch } from '@boluo/api-browser';
import type { Settings } from '@boluo/settings';
import { defaultSettings, toSettings } from '@boluo/settings';
import useSWRMutation, { type MutationFetcher } from 'swr/mutation';

export const userSettingsKey = ['/users/settings'] as const;

const updater: MutationFetcher<Settings, typeof userSettingsKey, Partial<Settings>> = async (
  _,
  { arg: settings },
) => {
  const settingsResult = await patch('/users/update_settings', null, settings);
  const mapped = settingsResult.map(toSettings);
  return mapped.isOk ? mapped.unwrap() : defaultSettings;
};

export const useMutateSettings = () =>
  useSWRMutation(userSettingsKey, updater, {
    populateCache: (result, current) => ({ ...(current ?? {}), ...result }),
    rollbackOnError: true,
    revalidate: false,
  });

export type MutateSettingsTrigger = ReturnType<typeof useMutateSettings>['trigger'];
