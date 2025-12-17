import type { ApiError, ChannelWithMaybeMember } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse, useSWRConfig } from 'swr';
import { unwrap } from '@boluo/utils/result';

export const useQueryChannelList = (
  spaceId: string,
): SWRResponse<ChannelWithMaybeMember[], ApiError> => {
  const { mutate } = useSWRConfig();
  const key = ['/channels/by_space', spaceId] as const;
  return useSWR<ChannelWithMaybeMember[], ApiError, typeof key>(
    key,
    ([path, id]) => get(path, { id }).then(unwrap),
    {
      onSuccess: (channels) =>
        void Promise.all(
          channels.map(({ channel }) =>
            mutate(['/channels/query', channel.id], channel, { revalidate: false }),
          ),
        ),
    },
  );
};
