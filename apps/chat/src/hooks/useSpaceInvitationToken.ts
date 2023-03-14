import { useGet } from 'common';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useSpaceInvitationToken = (spaceId: string): string => {
  const get = useGet();
  const { data } = useSWR(
    ['/spaces/token' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      suspense: true,
    },
  );
  return data;
};
