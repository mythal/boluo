import type { ChannelMembers } from 'api';
import { get } from 'api-browser';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useChannelMembers = (channelId: string): ChannelMembers => {
  const { data } = useSWR(
    ['/channels/members' as const, channelId],
    ([path, id]) => get(path, { id }).then(unwrap),
    { suspense: true },
  );
  return data;
};
