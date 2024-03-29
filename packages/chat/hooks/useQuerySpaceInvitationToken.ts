import { ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils';

export const useQuerySpaceInvitationToken = (spaceId: string): SWRResponse<string, ApiError> => {
  const key = ['/spaces/token', spaceId] as const;
  return useSWR<string, ApiError, typeof key>(key, ([path, id]) => get(path, { id }).then(unwrap));
};
