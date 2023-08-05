import type { ApiError, Channel } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse, useSWRConfig } from 'swr';
import { unwrap } from 'utils';

export const useChannelList = (spaceId: string): SWRResponse<Channel[], ApiError> => {
  const { mutate } = useSWRConfig();
  const key = ['/channels/by_space', spaceId] as const;
  return useSWR<Channel[], ApiError, typeof key>(
    key,
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      onSuccess: (channels) =>
        void Promise.all(
          channels.map((channel) => mutate(['/channels/query', channel.id], channel, { revalidate: false })),
        ),
    },
  );
};
