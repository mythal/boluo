import type { AppSettings } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryAppSettings = (): SWRResponse<AppSettings, Error> => {
  return useSWR(
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
};
