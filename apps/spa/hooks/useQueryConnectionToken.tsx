import { type ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { sleep } from '@boluo/utils';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryConnectionToken = (): SWRResponse<{ token: string | null }, ApiError> => {
  const key = ['/events/token'] as const;
  return useSWR<{ token: string | null }, ApiError, typeof key>(
    key,
    async ([path]) => {
      let result = await get(path, null);
      if (result.isErr) {
        await sleep(100);
        result = await get(path, null);
      }
      return result.unwrap();
    },
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      revalidateOnMount: true,
      onError: (error) => {
        alert('Failed to establish connection, please refresh the page');
      },
    },
  );
};
