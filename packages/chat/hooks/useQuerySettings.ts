import { ApiError } from 'api';
import { get } from 'api-browser';
import { Settings } from 'common';
import { defaultSettings, toSettings } from 'common/settings';
import useSWR, { SWRResponse } from 'swr';

export const useQuerySettings = (): SWRResponse<Settings, ApiError> => {
  const key = ['/users/settings'] as const;

  const fetchSettings = async ([path]: typeof key): Promise<Settings> => {
    const settings = await get(path, null);
    return toSettings(settings.unwrapOr(defaultSettings));
  };
  return useSWR(key, fetchSettings);
};
