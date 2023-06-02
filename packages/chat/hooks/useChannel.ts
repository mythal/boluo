import type { ApiError, Channel } from 'api';
import { get } from 'api-browser';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useChannel = (channelId: string): Channel => {
  const path = '/channels/query' as const;
  const { data, error } = useSWR<Channel, ApiError, [typeof path, string]>(
    ['/channels/query' as const, channelId],
    ([path, id]) => get(path, { id }).then(unwrap),
    { suspense: true },
  );
  if (error?.code === 'NOT_FOUND' || !data) {
    throw error;
  }

  return data;
};
