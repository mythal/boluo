import React, { useState } from 'react';
import { Space, SpaceMember } from '../api/spaces';
import { Link } from 'react-router-dom';
import { Seq } from 'immutable';
import { ChannelWithMember } from '../api/channels';
import { SidebarChannelItem } from './SidebarChannelItem';
import { Id } from '../id';

interface Props {
  space: Space;
  member: SpaceMember;
  channels: Seq.Indexed<ChannelWithMember>;
  currentSpace?: Id;
  currentChannel?: Id;
}

export const SidebarSpaceItem: React.FC<Props> = ({ space, channels, currentSpace, currentChannel }) => {
  const isCurrent = space.id === currentSpace;
  const [fold, setFold] = useState<boolean>(true);

  const spaceChannels = channels
    .filter(({ channel }) => channel.spaceId === space.id)
    .map(({ channel, member }) => (
      <li key={channel.id}>
        <SidebarChannelItem channel={channel} member={member} currentChannel={currentChannel} />
      </li>
    ))
    .toArray();
  const toggleFold = () => setFold(!fold);
  const hide = !isCurrent && fold;
  const expandButton = (
    <button disabled={spaceChannels.length === 0} onClick={toggleFold}>
      {hide ? '+' : '-'}
    </button>
  );
  const name = isCurrent ? <strong>{space.name}</strong> : <span>{space.name}</span>;
  return (
    <div>
      <div>
        {expandButton} <Link to={`/space/${space.id}`}>{name}</Link>
      </div>
      {hide ? null : <ul>{spaceChannels}</ul>}
    </div>
  );
};
