import { type ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import type { Settings } from '@boluo/settings';
import { defaultSettings, toSettings } from '@boluo/settings';
import useSWR, { type SWRResponse } from 'swr';
import { userSettingsKey } from './useMutateSettings';

export const useQuerySettings = (): SWRResponse<Settings, ApiError> => {
  const fetchSettings = async ([path]: typeof userSettingsKey): Promise<Settings> => {
    const settings = await get(path, null);
    return toSettings(settings.unwrapOr(defaultSettings));
  };
  return useSWR(userSettingsKey, fetchSettings);
};
