import type { AppSettings } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR from 'swr';

export const useQueryAppSettings = (): AppSettings => {
  const { data } = useSWR(
    ['/info/settings' as const, null],
    async ([path]): Promise<AppSettings> => {
      const result = await get(path, null);
      return result.unwrap();
    },
    {
      suspense: false,
      revalidateIfStale: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );
  return data || {};
};
