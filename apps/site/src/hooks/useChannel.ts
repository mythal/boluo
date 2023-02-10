import type { Channel } from 'api';
import useSWR from 'swr';
import { unwrap } from 'utils';
import { get } from '../api/browser';

export const useChannel = (channelId: string): Channel => {
  const { data } = useSWR(
    ['/channels/query' as const, channelId],
    ([path, id]) => get(path, { id }).then(unwrap),
  );
  return data;
};
