import React from 'react';
import { Channel } from '../api/channels';
import { Link } from 'react-router-dom';
import { ChannelMembershipButton } from './ChannelMembershipButton';
import { useMy } from '../App/App';

interface Props {
  channel: Channel;
  isSpaceMember: boolean;
}

export const ChannelItem: React.FC<Props> = ({ channel, isSpaceMember }) => {
  const joined = useMy().myChannels.has(channel.id);
  const button = isSpaceMember ? <ChannelMembershipButton channel={channel} joined={joined} /> : null;
  return (
    <div>
      <div>
        <Link className="text-xl" to={`/channel/${channel.id}`}>
          {channel.name}
        </Link>{' '}
        {button}
      </div>
    </div>
  );
};
