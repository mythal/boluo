import type { Space, SpaceMemberWithUser } from 'api';
import { useGet } from 'common';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useSpaceMembers = (spaceId: string): Record<string, SpaceMemberWithUser> => {
  const get = useGet();
  const { data } = useSWR(
    ['/spaces/members' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      suspense: true,
    },
  );
  return data;
};
