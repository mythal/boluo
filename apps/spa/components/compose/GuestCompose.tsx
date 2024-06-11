import { post } from '@boluo/api-browser';
import { useQueryCurrentUser } from '@boluo/common';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { type ChildrenProps } from '@boluo/utils';
import { useChannelId } from '../../hooks/useChannelId';

const GuestComposeBox: FC<ChildrenProps> = ({ children }) => (
  <div className="bg-compose-outer-bg border-t p-2 text-sm">
    <div className="bg-compose-bg border-compose-border w-full rounded-sm border py-2 text-center">{children}</div>
  </div>
);

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
      <button className="font-bold underline" onClick={join}>
        <FormattedMessage defaultMessage="Join" />
      </button>
    </GuestComposeBox>
  );
};
