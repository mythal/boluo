import { post } from 'api-browser';
import { useMe } from 'common';
import { UserPlus, UserX } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from 'ui';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';

interface Props {
  channelId: string;
}

export const ChannelHeaderMemberButton: FC<Props> = ({ channelId }) => {
  const me = useMe();
  const { mutate } = useSWRConfig();
  const channelMember = useMyChannelMember(channelId);
  const join = async () => {
    await post('/channels/join', null, { channelId, characterName: '' });
    await mutate(['/channels/members', channelId]);
  };

  const leave = async () => {
    await post('/channels/leave', { id: channelId }, {});
    await mutate(['/channels/members', channelId]);
  };
  if (me === null) {
    return null;
  }
  if (channelMember) {
    return (
      <Button data-small onClick={leave}>
        <UserX />
        <FormattedMessage defaultMessage="Leave" />
      </Button>
    );
  }
  return (
    <Button data-small onClick={join}>
      <UserPlus />
      <FormattedMessage defaultMessage="Join" />
    </Button>
  );
};
