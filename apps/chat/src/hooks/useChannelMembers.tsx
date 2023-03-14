import type { ChannelMembers } from 'api';
import { useGet } from 'common';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useChannelMembers = (channelId: string): ChannelMembers => {
  const get = useGet();
  const { data } = useSWR(
    ['/channels/members' as const, channelId],
    ([path, id]) => get(path, { id }).then(unwrap),
  );
  return data;
};
