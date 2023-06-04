import type { SpaceMember } from 'api';
import { get } from 'api-browser';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useMySpaceMember = (spaceId: string): SpaceMember | null => {
  const { data } = useSWR(
    ['/spaces/my_space_member' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      suspense: true,
    },
  );
  return data;
};