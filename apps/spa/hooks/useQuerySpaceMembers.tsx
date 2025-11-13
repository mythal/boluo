import type { ApiError, SpaceMemberWithUser } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils/result';

export const useQuerySpaceMembers = (
  spaceId: string,
): SWRResponse<Record<string, SpaceMemberWithUser>, ApiError> => {
  const key = ['/spaces/members', spaceId] as const;
  return useSWR<Record<string, SpaceMemberWithUser>, ApiError, typeof key>(key, ([path, id]) =>
    get(path, { id }).then(unwrap),
  );
};
