import type { ApiError, User } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import { type Result } from '@boluo/utils';

export const useQueryCurrentUser = (
  config?: SWRConfiguration<User | null, ApiError>,
): SWRResponse<User | null, ApiError> => {
  return useSWR(
    ['/users/query' as const, null],
    async ([path]): Promise<User | null> => {
      let result: Result<User | null, ApiError> = await get(path, { id: null });
      if (result.isErr) {
        result = await get(path, { id: null });
      }
      return result.unwrap();
    },
    config,
  );
};
