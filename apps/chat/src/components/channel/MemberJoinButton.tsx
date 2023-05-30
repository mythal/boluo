import { ChannelWithMember } from 'api';
import { post } from 'api-browser';
import { useMe } from 'common';
import { UserPlus } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button, Spinner } from 'ui';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';

interface Props {
  channelId: string;
}

const join: MutationFetcher<ChannelWithMember, { characterName?: string }, [string, string]> = async (
  [_, channelId],
  { arg: { characterName = '' } },
) => {
  const channelWithMember = await post('/channels/join', null, { channelId, characterName });
  return channelWithMember.unwrap();
};

export const MemberJoinButton: FC<Props> = ({ channelId }) => {
  const me = useMe();
  const { trigger, isMutating } = useSWRMutation(['/channels/members', channelId], join);
  const channelMember = useMyChannelMember(channelId);

  const handleClick = async () => {
    await trigger({});
  };

  if (me === null) {
    return null;
  }
  return (
    <Button data-small disabled={channelMember != null || isMutating} onClick={handleClick}>
      {isMutating ? <Spinner /> : <UserPlus />}
      <FormattedMessage defaultMessage="Join" />
    </Button>
  );
};
