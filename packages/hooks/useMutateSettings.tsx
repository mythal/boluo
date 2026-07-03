import { patch } from '@boluo/api-browser';
import type { Settings } from '@boluo/settings';
import { defaultSettings, toSettings } from '@boluo/settings';
import useSWRMutation, { type MutationFetcher } from 'swr/mutation';
import { readGuestSettings, writeGuestSettings } from './guestSettings';
import { useQueryCurrentUser } from './useQueryCurrentUser';

export type UserSettingsKey = readonly ['/users/settings', string | null];

export const userSettingsKey = (userId: string | null | undefined): UserSettingsKey => [
  '/users/settings',
  userId ?? null,
];

const updater: MutationFetcher<Settings, UserSettingsKey, Partial<Settings>> = async (
  [, userId],
  { arg: settings },
) => {
  if (userId == null) {
    const nextSettings = { ...readGuestSettings(), ...settings };
    writeGuestSettings(nextSettings);
    return nextSettings;
  }
  const settingsResult = await patch('/users/update_settings', null, settings);
  if (settingsResult.isErr && settingsResult.err.code === 'UNAUTHENTICATED') {
    const nextSettings = { ...readGuestSettings(), ...settings };
    writeGuestSettings(nextSettings);
    return nextSettings;
  }
  const mapped = settingsResult.map(toSettings);
  return mapped.isOk ? mapped.unwrap() : defaultSettings;
};

export const useMutateSettings = () => {
  const { data: currentUser } = useQueryCurrentUser();
  return useSWRMutation(userSettingsKey(currentUser?.id), updater, {
    populateCache: (result, current) => ({ ...(current ?? {}), ...result }),
    rollbackOnError: true,
    revalidate: false,
  });
};

export type MutateSettingsTrigger = ReturnType<typeof useMutateSettings>['trigger'];
