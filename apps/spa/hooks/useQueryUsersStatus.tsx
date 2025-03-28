import { type ApiError, type UserStatus } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryUsersStatus = (
  spaceId: string,
): SWRResponse<Record<string, UserStatus>, ApiError> => {
  const key = ['/spaces/users_status', spaceId] as const;
  return useSWR<Record<string, UserStatus>, ApiError, typeof key>(
    key,
    async ([path, spaceId]) => {
      const result = await get(path, { id: spaceId });
      return result.unwrap();
    },
    {
      fallbackData: {},
    },
  );
};
