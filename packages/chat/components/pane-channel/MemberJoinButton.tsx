import { ChannelWithMember } from 'api';
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
  channelId: string;
  spaceId: string | null;
}

const join: MutationFetcher<ChannelWithMember, { characterName?: string }, [string, string]> = async (
  [_, channelId],
  { arg: { characterName = '' } },
) => {
  const channelWithMember = await post('/channels/join', null, { channelId, characterName });
  return channelWithMember.unwrap();
};

export const MemberJoinButton: FC<Props> = ({ channelId, spaceId }) => {
  const me = useMe();
  const { trigger, isMutating } = useSWRMutation(['/channels/members', channelId], join);
  const { data: spaceMember } = useMySpaceMember(spaceId);
  const channelMember = useMyChannelMember(channelId);
  const intl = useIntl();

  const handleClick = async () => {
    if (me == null) {
      alert(intl.formatMessage({ defaultMessage: 'You must be logged in to join a channel.' }));
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
