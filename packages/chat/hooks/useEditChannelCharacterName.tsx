import { ApiError, ChannelMember } from 'api';
import { post } from 'api-browser';
import useSWRMutation, { SWRMutationConfiguration, SWRMutationResponse } from 'swr/mutation';

interface Arg {
  characterName: string;
}

type Key = ['/channels/members', string];

export const useEditChannelCharacterName = (
  channelId: string,
  config?: SWRMutationConfiguration<ChannelMember, ApiError, Arg, Key>,
): SWRMutationResponse<ChannelMember, ApiError, Arg, Key> => {
  return useSWRMutation<ChannelMember, ApiError, Key, Arg>(
    ['/channels/members', channelId],
    async ([, channelId], { arg: { characterName } }) => {
      const result = await post('/channels/edit_member', null, { channelId, characterName, textColor: null });
      return result.unwrap();
    },
    config,
  );
};
