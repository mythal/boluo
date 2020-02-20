import React from 'react';
import { Channel, ChannelMember } from '../api/channels';
import { Link } from 'react-router-dom';
import { Id } from '../id';

interface Props {
  channel: Channel;
  member: ChannelMember;
  currentChannel?: Id;
}

export const SidebarChannelItem: React.FC<Props> = ({ channel, currentChannel }) => {
  const name = currentChannel === channel.id ? <strong>{channel.name}</strong> : <span>{channel.name}</span>;
  return (
    <div>
      <Link to={`/channel/${channel.id}`}>{name}</Link>
    </div>
  );
};
