import { ApiError } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from 'utils';

export const useSpaceInvitationToken = (spaceId: string): SWRResponse<string, ApiError> => {
  const key = ['/spaces/token', spaceId] as const;
  return useSWR<string, ApiError, typeof key>(
    key,
    ([path, id]) => get(path, { id }).then(unwrap),
  );
};
