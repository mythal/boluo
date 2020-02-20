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
  const isCurrent = currentChannel === channel.id;
  const name = isCurrent ? <strong>{channel.name}</strong> : <span>{channel.name}</span>;
  return (
    <Link
      className={`block w-full py-1 px-4 text-white hover:text-white hover:no-underline ${
        isCurrent ? 'bg-teal-700' : ''
      }`}
      to={`/channel/${channel.id}`}
    >
      {name}
    </Link>
  );
};
