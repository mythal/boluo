import type { SpaceMember } from 'api';
import { useGet } from 'common';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useMySpaceMember = (spaceId: string): SpaceMember | null => {
  const get = useGet();
  const { data } = useSWR(
    ['/spaces/my_space_member' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      suspense: true,
    },
  );
  return data;
};
