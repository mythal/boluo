import { post } from '@boluo/api-browser';
import { useQueryCurrentUser } from '@boluo/common';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from '@boluo/ui/Button';
import { type ChildrenProps } from '@boluo/utils';
import { useChannelId } from '../../hooks/useChannelId';

const GuestComposeBox: FC<ChildrenProps> = ({ children }) => <div className="py-2 text-center">{children}</div>;

export const GuestCompose = () => {
  const { data: currentUser } = useQueryCurrentUser();
  const channelId = useChannelId();
  const { mutate } = useSWRConfig();
  const join = async () => {
    await post('/channels/join', null, { channelId, characterName: '' });
    await mutate(['/channels/members', channelId]);
  };
  if (!currentUser) {
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
      <Button data-small onClick={join}>
        Join
      </Button>
    </GuestComposeBox>
  );
};
