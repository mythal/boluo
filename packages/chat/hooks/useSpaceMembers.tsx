import type { SpaceMemberWithUser } from 'api';
import { get } from 'api-browser';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useSpaceMembers = (spaceId: string): Record<string, SpaceMemberWithUser> => {
  const { data } = useSWR(
    ['/spaces/members' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      suspense: true,
    },
  );
  return data;
};
