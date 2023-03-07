import { Settings, useGet } from 'common';
import { defaultSettings, toSettings } from 'common/settings';
import useSWR from 'swr';

export const useSettings = (): Settings => {
  const get = useGet();
  const { data } = useSWR('/users/settings', async (path): Promise<Settings> => {
    const settings = await get(path, null);
    return toSettings(settings.unwrapOr(defaultSettings));
  });
  return data;
};
