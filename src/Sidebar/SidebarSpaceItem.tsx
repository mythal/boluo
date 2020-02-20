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
  let symbol = '';
  if (spaceChannels.length > 0 && !isCurrent) {
    symbol = hide ? '+' : '-';
  }
  const expandButton = (
    <button className="" disabled={spaceChannels.length === 0} onClick={toggleFold}>
      {hide ? '+' : '-'}
    </button>
  );
  const name = isCurrent ? <strong>{space.name}</strong> : <span>{space.name}</span>;
  return (
    <div>
      <div
        className={`flex w-full justify-between hover:bg-teal-800 py-1 px-2 ${isCurrent ? '  bg-gray-600' : ''}`}
        onClick={toggleFold}
      >
        <Link
          className="truncate block flext-1 text-white hover:no-underline hover:text-white"
          to={`/space/${space.id}`}
        >
          {name}
        </Link>
        {isCurrent ? null : (
          <div className="block text-gray-500 mx-1 w-4 text-center cursor-pointer select-none">{symbol}</div>
        )}
      </div>
      {hide ? null : <ul className="bg-teal-800 shadow-inner">{spaceChannels}</ul>}
    </div>
  );
};
