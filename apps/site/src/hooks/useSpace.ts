import type { Space } from 'boluo-api';
import { unwrap } from 'boluo-utils';
import useSWR from 'swr';
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
