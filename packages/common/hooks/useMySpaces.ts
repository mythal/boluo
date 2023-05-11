import { SpaceWithMember } from 'api';
import { get } from 'api-browser';
import useSWR from 'swr';
import { unwrap } from 'utils';
import { useMe } from './useMe';

export const useMySpaces = (): SpaceWithMember[] => {
  const me = useMe();
  const { data: mySpaces } = useSWR('/spaces/my', (path) => get(path, null).then(unwrap), {
    fallbackData: me?.mySpaces ?? [],
  });
  return mySpaces;
};
