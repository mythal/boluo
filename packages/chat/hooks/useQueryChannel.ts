import type { ApiError, Channel } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from 'utils';

export const useQueryChannel = (channelId: string): SWRResponse<Channel, ApiError> => {
  const key = ['/channels/query', channelId] as const;
  return useSWR<Channel, ApiError, typeof key>(key, ([path, id]) => get(path, { id }).then(unwrap));
};
