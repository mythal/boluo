import type { ApiError, User } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { SWRResponse } from 'swr';
import { Result } from '@boluo/utils';

export const useUser = (userId: string): SWRResponse<User | null, ApiError> => {
  return useSWR(['/users/query' as const, userId], async ([path, userId]): Promise<User | null> => {
    const result: Result<User, ApiError> = await get(path, { id: userId });
    if (result.isOk) {
      return result.some;
    }
    const error = result.err;
    if (error.code === 'NOT_FOUND') {
      return null;
    }
    throw error;
  });
};
