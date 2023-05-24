import type { Channel } from 'api';
import { get } from 'api-browser';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useChannel = (channelId: string): Channel => {
  const { data } = useSWR(
    ['/channels/query' as const, channelId],
    ([path, id]) => get(path, { id }).then(unwrap),
    { suspense: true },
  );
  return data;
};
