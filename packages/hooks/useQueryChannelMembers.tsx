import type { ApiError, ChannelMembers } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import { sleep } from '@boluo/utils/async';
import { unwrap } from '@boluo/utils/result';

export const useQueryChannelMembers = (
  channelId: string,
  config?: SWRConfiguration<ChannelMembers, ApiError>,
): SWRResponse<ChannelMembers, ApiError> => {
  const key = ['/channels/members' as const, channelId] as const;
  return useSWR<ChannelMembers, ApiError, typeof key>(
    key,
    async ([path, id]) => {
      const result = await get(path, { id });
      if (result.isErr) {
        if (result.err.code === 'FETCH_FAIL') {
          await sleep(20);
          return await get(path, { id }).then(unwrap);
        }
        throw result.err;
      }
      return result.some;
    },
    config,
  );
};
