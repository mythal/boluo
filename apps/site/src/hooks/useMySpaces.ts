import type { SpaceWithMember } from 'api';
import useSWR from 'swr';
import { unwrap } from 'utils';
import { get } from '../api/browser';
import { useMe } from './useMe';

export const useMySpaces = (): SpaceWithMember[] => {
  const me = useMe();
  const { data: mySpaces } = useSWR('/spaces/my', (path) => get(path, null).then(unwrap), {
    fallbackData: me?.mySpaces ?? [],
  });
  return mySpaces;
};
