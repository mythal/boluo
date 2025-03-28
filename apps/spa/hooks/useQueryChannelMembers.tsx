import type { ApiError, ChannelMembers } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils';

export const useQueryChannelMembers = (
  channelId: string,
  config?: SWRConfiguration<ChannelMembers, ApiError>,
): SWRResponse<ChannelMembers, ApiError> => {
  const key = ['/channels/members' as const, channelId] as const;
  return useSWR<ChannelMembers, ApiError, typeof key>(
    key,
    ([path, id]) => get(path, { id }).then(unwrap),
    config,
  );
};
