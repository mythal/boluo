import type { ApiError, User } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { Result } from '@boluo/utils';

export const useQueryCurrentUser = (
  config?: SWRConfiguration<User | null, ApiError>,
): SWRResponse<User | null, ApiError> => {
  return useSWR(
    ['/users/query' as const, null],
    async ([path]): Promise<User | null> => {
      const result: Result<User | null, ApiError> = await get(path, { id: null });
      return result.unwrapOr(null);
    },
    config,
  );
};
