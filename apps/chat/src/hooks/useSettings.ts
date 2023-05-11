import { get } from 'api-browser';
import { Settings } from 'common';
import { defaultSettings, toSettings } from 'common/settings';
import useSWR from 'swr';

export const useSettings = (): Settings => {
  const { data } = useSWR('/users/settings', async (path): Promise<Settings> => {
    const settings = await get(path, null);
    return toSettings(settings.unwrapOr(defaultSettings));
  });
  return data;
};
