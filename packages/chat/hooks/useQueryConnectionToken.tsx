import { ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { SWRResponse } from 'swr';

export const useQueryConnectionToken = (): SWRResponse<{ token: string | null }, ApiError> => {
  const key = ['/events/token'] as const;
  return useSWR<{ token: string | null }, ApiError, typeof key>(
    key,
    async ([path]) => {
      const result = await get(path, null);
      return result.unwrap();
    },
    {
      refreshInterval: 60 * 60 * 1000,
      revalidateOnFocus: false,
    },
  );
};
