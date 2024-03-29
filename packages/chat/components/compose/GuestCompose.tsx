import { post } from 'api-browser';
import { useMe } from 'common';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from 'ui/Button';
import { ChildrenProps } from 'utils';
import { useChannelId } from '../../hooks/useChannelId';

const GuestComposeBox: FC<ChildrenProps> = ({ children }) => <div className="py-2 text-center">{children}</div>;

export const GuestCompose = () => {
  const me = useMe();
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
      <Button data-small onClick={join}>
        Join
      </Button>
    </GuestComposeBox>
  );
};
