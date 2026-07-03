import { type ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import type { Settings } from '@boluo/settings';
import { defaultSettings, toSettings } from '@boluo/settings';
import useSWR, { type SWRResponse } from 'swr';
import { userSettingsKey } from './useMutateSettings';
import { readGuestSettings } from './guestSettings';
import { useQueryCurrentUser } from './useQueryCurrentUser';

export const useQuerySettings = (): SWRResponse<Settings, ApiError> => {
  const { data: currentUser, isLoading: isQueryingCurrentUser } = useQueryCurrentUser();
  const fetchSettings = async ([path, userId]: ReturnType<
    typeof userSettingsKey
  >): Promise<Settings> => {
    if (userId == null) {
      return readGuestSettings();
    }
    const settings = await get(path, null);
    return toSettings(settings.unwrapOr(defaultSettings));
  };
  const key =
    currentUser === undefined && isQueryingCurrentUser ? null : userSettingsKey(currentUser?.id);
  return useSWR(key, fetchSettings);
};
