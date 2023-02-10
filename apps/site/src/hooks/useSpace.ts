import type { Space } from 'api';
import useSWR from 'swr';
import { unwrap } from 'utils';
import { get } from '../api/browser';

export const useSpace = (spaceId: string): Space => {
  const { data } = useSWR(
    ['/spaces/query' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      suspense: true,
    },
  );
  return data;
};
