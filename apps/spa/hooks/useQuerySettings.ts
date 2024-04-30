import { ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { Settings } from '@boluo/common';
import { defaultSettings, toSettings } from '@boluo/common/settings';
import useSWR, { SWRResponse } from 'swr';

export const useQuerySettings = (): SWRResponse<Settings, ApiError> => {
  const key = ['/users/settings'] as const;

  const fetchSettings = async ([path]: typeof key): Promise<Settings> => {
    const settings = await get(path, null);
    return toSettings(settings.unwrapOr(defaultSettings));
  };
  return useSWR(key, fetchSettings);
};
