import type { Channel } from 'api';
import { useGet } from 'common';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useChannel = (channelId: string): Channel => {
  const get = useGet();
  const { data } = useSWR(
    ['/channels/query' as const, channelId],
    ([path, id]) => get(path, { id }).then(unwrap),
  );
  return data;
};
