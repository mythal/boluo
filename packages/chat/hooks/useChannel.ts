import type { ApiError, Channel } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from 'utils';

export const useChannel = (channelId: string): SWRResponse<Channel, ApiError> => {
  const path = '/channels/query' as const;
  return useSWR<Channel, ApiError, [typeof path, string]>(
    ['/channels/query' as const, channelId],
    ([path, id]) => get(path, { id }).then(unwrap),
  );
};
