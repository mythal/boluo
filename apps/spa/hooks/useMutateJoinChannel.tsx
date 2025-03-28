import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { type ChannelWithMember, type ApiError } from '@boluo/api';

const path = '/channels/members';
type Key = readonly [typeof path, string];

interface Args {
  characterName?: string;
}

const updater: MutationFetcher<ChannelWithMember, Key, Args> = async (
  [_, channelId],
  { arg: { characterName = '' } },
) => {
  const result = await post('/channels/join', null, { channelId, characterName });
  return result.unwrap();
};

export const useMutateJoinChannel = (
  channelId: string,
  options: SWRMutationConfiguration<ChannelWithMember, ApiError, Key, Args> = {
    revalidate: true,
  },
) =>
  useSWRMutation<ChannelWithMember, ApiError, Key, Args>(
    [path, channelId] as const,
    updater,
    options,
  );
