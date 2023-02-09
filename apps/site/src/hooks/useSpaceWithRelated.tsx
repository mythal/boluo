import type { SpaceWithRelated } from 'boluo-api';
import { unwrap } from 'boluo-utils';
import useSWR, { useSWRConfig } from 'swr';
import { get } from '../api/browser';

const options = { revalidate: false };

export const useSpaceWithRelated = (spaceId: string): SpaceWithRelated => {
  const { mutate } = useSWRConfig();
  const { data } = useSWR(
    ['/spaces/query_with_related' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      suspense: true,
      onSuccess: (({ space, channels }) => {
        void mutate(['/space/query', space.id], space, options);
        void mutate(['/channels/by_space', space.id], channels, options);
        void Promise.all(
          channels.map((channel) => mutate(['/channels/query', channel.id], channel, options)),
        );
      }),
    },
  );
  return data;
};
