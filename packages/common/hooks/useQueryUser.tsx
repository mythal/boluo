import type { ApiError, User } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { Result } from '@boluo/utils';

/**
 * Query user by id
 * @param userId query current user if userId is not provided
 * @returns null if user is not found
 */
export const useQueryUser = (
  userId?: string,
  config?: SWRConfiguration<User | null, ApiError>,
): SWRResponse<User | null, ApiError> => {
  return useSWR(
    ['/users/query' as const, userId],
    async ([path, userId]): Promise<User | null> => {
      const result: Result<User, ApiError> = await get(path, { id: userId ?? null });
      if (result.isOk) {
        return result.some;
      }
      const error = result.err;
      if (error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    },
    config,
  );
};
