import React from 'react';
import { User } from '../api/users';
import { Channel, ChannelMember } from '../api/channels';
import { ChannelMembershipButton } from '../SpacePage/ChannelMembershipButton';
import { Link } from 'react-router-dom';
import { ChannelMemberZone } from './ChannelMemberZone';

interface Props {
  channel: Channel;
  user: User;
  member?: ChannelMember;
}

export const ChannelUserZone: React.FC<Props> = ({ channel, user, member }) => {
  const memberZone = member === undefined ? null : <ChannelMemberZone member={member} />;

  return (
    <div className="flex items-center">
      <div className="mx-2">
        {user.nickname} <Link to="/logout">登出</Link>
      </div>
      <div>{memberZone}</div>
      <div>
        <ChannelMembershipButton channel={channel} joined={!!member} />
      </div>
    </div>
  );
};
