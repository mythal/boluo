import { Channel, ChannelWithMember } from 'api';
import { post } from 'api-browser';
import { useMe } from 'common';
import { UserPlus } from 'icons';
import { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button } from 'ui/Button';
import { Spinner } from 'ui/Spinner';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { useMySpaceMember } from '../../hooks/useQueryMySpaceMember';

interface Props {
  channel: Channel;
}

const join: MutationFetcher<ChannelWithMember, { characterName?: string }, [string, string]> = async (
  [_, channelId],
  { arg: { characterName = '' } },
) => {
  const channelWithMember = await post('/channels/join', null, { channelId, characterName });
  return channelWithMember.unwrap();
};

export const MemberJoinButton: FC<Props> = ({ channel }) => {
  const me = useMe();
  const { trigger, isMutating } = useSWRMutation(['/channels/members', channel.id], join);
  const { data: spaceMember } = useMySpaceMember(channel.spaceId);
  const channelMember = useMyChannelMember(channel.id);
  const intl = useIntl();

  const handleClick = async () => {
    if (me == null) {
      alert(intl.formatMessage({ defaultMessage: 'You must be logged in to join a channel.' }));
      return;
    }
    if (!channel.isPublic) {
      alert(intl.formatMessage({ defaultMessage: 'You must be invited to join a private channel.' }));
      return;
    }
    if (spaceMember == null) {
      alert(intl.formatMessage({ defaultMessage: 'You must first join the space to join a channel.' }));
      return;
    }
    if (channelMember != null) {
      alert(intl.formatMessage({ defaultMessage: 'You are already a member of this channel.' }));
      return;
    }

    await trigger({});
  };

  return (
    <Button data-small disabled={me === 'LOADING' || isMutating} onClick={handleClick}>
      {isMutating ? <Spinner /> : <UserPlus />}
      <FormattedMessage defaultMessage="Join" />
    </Button>
  );
};
