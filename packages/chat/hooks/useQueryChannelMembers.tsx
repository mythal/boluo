import type { ApiError, ChannelMembers } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from 'utils';

export const useQueryChannelMembers = (channelId: string): SWRResponse<ChannelMembers, ApiError> => {
  const key = ['/channels/members' as const, channelId] as const;
  return useSWR<ChannelMembers, ApiError, typeof key>(
    key,
    ([path, id]) => get(path, { id }).then(unwrap),
  );
};
