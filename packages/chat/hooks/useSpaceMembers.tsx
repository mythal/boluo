import type { ApiError, SpaceMemberWithUser } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from 'utils';

export const useSpaceMembers = (spaceId: string): SWRResponse<Record<string, SpaceMemberWithUser>, ApiError> => {
  const key = ['/spaces/members', spaceId] as const;
  return useSWR<Record<string, SpaceMemberWithUser>, ApiError, typeof key>(
    key,
    ([path, id]) => get(path, { id }).then(unwrap),
  );
};
