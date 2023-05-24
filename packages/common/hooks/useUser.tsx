import type { ApiError, User } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse } from 'swr';
import { Result } from 'utils';

export const useUser = (
  userId: string,
): SWRResponse<User | null, ApiError> => {
  return useSWR(
    ['/users/query' as const, userId],
    async ([path, userId]): Promise<User | null> => {
      const result: Result<User, ApiError> = await get(path, { id: userId });
      if (result.isOk) {
        return result.some;
      }
      const error = result.err;
      if (error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    },
    { suspense: true },
  );
};
