import { useMe, usePost } from 'common';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from 'ui';
import { ChildrenProps } from 'utils';
import { useChannelId } from '../../hooks/useChannelId';

const GuestComposeBox: FC<ChildrenProps> = ({ children }) => <div className="text-center py-2">{children}</div>;

export const GuestCompose = () => {
  const me = useMe();
  const post = usePost();
  const channelId = useChannelId();
  const { mutate } = useSWRConfig();
  const join = async () => {
    await post('/channels/join', null, { channelId, characterName: '' });
    await mutate(['/channels/members', channelId]);
  };
  if (!me) {
    return (
      <GuestComposeBox>
        <FormattedMessage defaultMessage="You are not logged in" />
      </GuestComposeBox>
    );
  }
  return (
    <GuestComposeBox>
      <span className="mr-1">
        <FormattedMessage defaultMessage="You are not a member of this channel" />
      </span>
      <Button data-small onClick={join}>Join</Button>
    </GuestComposeBox>
  );
};
