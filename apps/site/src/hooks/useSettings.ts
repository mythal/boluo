import useSWR from 'swr';
import { get } from '../api/browser';
import type { Settings } from '../settings';
import { defaultSettings, toSettings } from '../settings';

export const useSettings = (): Settings => {
  const { data } = useSWR('/users/settings', async (path): Promise<Settings> => {
    const settings = await get(path, null);
    return toSettings(settings.unwrapOr(defaultSettings));
  });
  return data;
};
