import { ApiError, User } from 'api';
import useSWR, { SWRResponse } from 'swr';
import { Result, unwrap } from 'utils';
import { useGet } from './useGet';

export const useUser = (userId: string): SWRResponse<User | null, ApiError> => {
  const get = useGet();
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
  );
};
