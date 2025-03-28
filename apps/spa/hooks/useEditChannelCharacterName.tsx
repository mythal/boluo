import { type ApiError, type ChannelMember } from '@boluo/api';
import { post } from '@boluo/api-browser';
import useSWRMutation, {
  type SWRMutationConfiguration,
  type SWRMutationResponse,
} from 'swr/mutation';

interface Arg {
  characterName: string;
}

type Key = ['/channels/members', string];

export const useEditChannelCharacterName = (
  channelId: string,
  config?: SWRMutationConfiguration<ChannelMember, ApiError, Key, Arg>,
): SWRMutationResponse<ChannelMember, ApiError, Key, Arg> => {
  return useSWRMutation<ChannelMember, ApiError, Key, Arg>(
    ['/channels/members', channelId],
    async ([, channelId], { arg: { characterName } }) => {
      const result = await post('/channels/edit_member', null, {
        channelId,
        characterName,
        textColor: null,
      });
      return result.unwrap();
    },
    config,
  );
};
