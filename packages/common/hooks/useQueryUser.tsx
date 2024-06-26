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
  userId: string,
  config?: SWRConfiguration<User, ApiError>,
): SWRResponse<User, ApiError> => {
  return useSWR(
    ['/users/query' as const, userId],
    async ([path, userId]): Promise<User> => {
      const result: Result<User | null, ApiError> = await get(path, { id: userId });
      if (result.isErr) {
        throw result.err;
      } else if (result.some == null) {
        const userNotFound: ApiError = { code: 'NOT_FOUND', message: `User (${userId}) not found` };
        throw userNotFound;
      } else {
        return result.some;
      }
    },
    config,
  );
};
