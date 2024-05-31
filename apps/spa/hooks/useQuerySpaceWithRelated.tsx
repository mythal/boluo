import { type ApiError, type SpaceWithRelated } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse, useSWRConfig } from 'swr';
import { unwrap } from '@boluo/utils';

const options = { revalidate: false };

/** @deprecated */
export const useQuerySpaceWithRelated = (spaceId: string): SWRResponse<SpaceWithRelated, ApiError> => {
  const { mutate } = useSWRConfig();
  const key = ['/spaces/query_with_related', spaceId] as const;
  return useSWR<SpaceWithRelated, ApiError, typeof key>(
    ['/spaces/query_with_related' as const, spaceId],
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      onSuccess: ({ space, channels }) => {
        void mutate(['/space/query', space.id], space, options);
        void Promise.all(channels.map((channel) => mutate(['/channels/query', channel.id], channel, options)));
      },
    },
  );
};
