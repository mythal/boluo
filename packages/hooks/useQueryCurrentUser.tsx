import type { ApiError, User } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import { sleep } from '@boluo/utils/async';
import { type Result } from '@boluo/utils/result';

export const useQueryCurrentUser = (
  config?: SWRConfiguration<User | null, ApiError>,
): SWRResponse<User | null, ApiError> => {
  return useSWR(
    ['/users/query' as const, null],
    async ([path]): Promise<User | null> => {
      let result: Result<User | null, ApiError> = await get(path, { id: null });
      if (result.isErr && result.err.code === 'FETCH_FAIL') {
        await sleep(10);
        result = await get(path, { id: null });
      }
      return result.unwrap();
    },
    config,
  );
};
