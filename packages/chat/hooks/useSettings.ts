import { ApiError } from 'api';
import { get } from 'api-browser';
import { Settings } from 'common';
import { defaultSettings, toSettings } from 'common/settings';
import useSWR, { SWRResponse } from 'swr';

const fetchSettings = async (): Promise<Settings> => {
  const settings = await get('/users/settings', null);
  return toSettings(settings.unwrapOr(defaultSettings));
};

export const useSettings = (): SWRResponse<Settings, ApiError> => {
  return useSWR('/users/settings', fetchSettings);
};
