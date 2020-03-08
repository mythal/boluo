import React from 'react';
import { Channel, ChannelMember } from '../../api/channels';
import { NavLink } from 'react-router-dom';

interface ChannelItemProps {
  channel: Channel;
  member: ChannelMember;
  isCurrent: boolean;
}

export const ChannelItem = React.memo<ChannelItemProps>(({ channel }) => {
  return (
    <li>
      <NavLink draggable={false} className="channel-item" activeClassName="bg-gray-300" to={`/channel/${channel.id}`}>
        {channel.name}
      </NavLink>
    </li>
  );
});
