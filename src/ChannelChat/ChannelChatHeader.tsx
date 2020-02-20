import React from 'react';
import { Channel, ChannelMember } from '../api/channels';
import { useMe } from '../App/App';
import { GUEST } from '../App/states';
import { ChannelGuestUserZone } from './ChannelGuestUserZone';
import { ChannelUserZone } from './ChannelUserZone';

interface Props {
  channel: Channel;
  member?: ChannelMember;
}

export const ChannelChatHeader: React.FC<Props> = ({ channel, member }) => {
  const me = useMe();
  const userZone =
    me === GUEST ? <ChannelGuestUserZone /> : <ChannelUserZone channel={channel} user={me} member={member} />;
  return (
    <div>
      <div>{channel.name}</div>
      <div>{userZone}</div>
    </div>
  );
};
