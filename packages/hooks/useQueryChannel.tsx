import type { ApiError, Channel } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils/result';

export const useQueryChannel = (channelId: string): SWRResponse<Channel, ApiError> => {
  const key = ['/channels/query', channelId] as const;
  return useSWR<Channel, ApiError, typeof key>(key, ([path, id]) => get(path, { id }).then(unwrap));
};
