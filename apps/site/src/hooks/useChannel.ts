import type { Channel } from 'boluo-api';
import { unwrap } from 'boluo-utils';
import useSWR from 'swr';
import { get } from '../api/browser';

export const useChannel = (channelId: string): Channel => {
  const { data } = useSWR(
    ['/channels/query' as const, channelId],
    ([path, id]) => get(path, { id }).then(unwrap),
  );
  return data;
};
