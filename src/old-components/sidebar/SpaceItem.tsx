import React, { useState } from 'react';
import { Space, SpaceMember } from '../../api/spaces';
import { List, OrderedMap } from 'immutable';
import { Id } from '../../utils';
import { ChannelWithMember } from '../../api/channels';
import { CaretRightIcon, DownIcon, RightIcon } from '../icons';
import { NavLink } from 'react-router-dom';
import { ChannelItem } from './ChannelItem';

const EnterSpaceLink = React.memo<{ id: Id }>(({ id }) => {
  return (
    <NavLink
      to={`/space/${id}`}
      onClick={(e) => e.stopPropagation()}
      className="opacity-0 group-hover:opacity-100 py-0 px-2 text-xs btn-sized rounded"
      activeClassName="btn-down"
    >
      <CaretRightIcon />
    </NavLink>
  );
});

interface SpaceItemProps {
  space: Space;
  member: SpaceMember;
  channels: OrderedMap<Id, ChannelWithMember>;
  isCurrent: boolean;
  channelId?: string;
}

export const SpaceItem = React.memo<SpaceItemProps>(({ space, channels, channelId }) => {
  const [fold, setFold] = useState(false);
  const Icon = fold ? RightIcon : DownIcon;
  const channelList = fold
    ? List()
    : channels
        .filter(({ channel }) => channel.spaceId === space.id)
        .map(({ channel, member }) => (
          <ChannelItem key={channel.id} channel={channel} member={member} isCurrent={channelId === channel.id} />
        ))
        .valueSeq();
  return (
    <li className="group">
      <div
        className="flex items-center py-1 px-2 text-xs font-bold cursor-pointer hover:bg-gray-300 select-none"
        onClick={() => setFold(!fold)}
      >
        <span className="mr-1 w-4 inline-block">
          <Icon />
        </span>
        <span className="flex-grow inline-block mr-1">{space.name}</span>
        <EnterSpaceLink id={space.id} />
      </div>

      <ul hidden={fold}>{channelList}</ul>
    </li>
  );
});
