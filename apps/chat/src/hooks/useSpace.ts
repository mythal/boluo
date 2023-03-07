import type { Space } from 'api';
import { useGet } from 'common';
import useSWR from 'swr';
import { unwrap } from 'utils';

export const useSpace = (spaceId: string): Space => {
  const get = useGet();
  const { data } = useSWR(
    ['/spaces/query' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      suspense: true,
    },
  );
  return data;
};
