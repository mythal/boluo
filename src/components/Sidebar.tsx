import React, { useState } from 'react';
import { My } from '../states/states';
import { Space, SpaceMember } from '../api/spaces';
import { Channel, ChannelMember, ChannelWithMember } from '../api/channels';
import { List, OrderedMap } from 'immutable';
import { Id } from '../id';
import { Link } from 'react-router-dom';
import { CaretRightIcon, DownIcon, RightIcon } from './icons';
import { CreateSpace } from './CreateSpace';
import { useChannel } from './App';
import { cls } from '../classname';

interface ChannelItemProps {
  channel: Channel;
  member: ChannelMember;
  isCurrent: boolean;
}

const ChannelItem = React.memo<ChannelItemProps>(({ channel, member, isCurrent }) => {
  return (
    <li>
      <Link
        draggable={false}
        className={cls('channel-item', { 'font-bold bg-gray-300': isCurrent })}
        to={`/channel/${channel.id}`}
      >
        {channel.name}
      </Link>
    </li>
  );
});

const EnterSpaceLink = React.memo<{ id: Id }>(({ id }) => {
  return (
    <Link
      to={`/space/${id}`}
      onClick={e => e.stopPropagation()}
      className="opacity-0 group-hover:opacity-100 btn py-0 px-2 text-xs rounded"
    >
      <CaretRightIcon />
    </Link>
  );
});

interface SpaceItemProps {
  space: Space;
  member: SpaceMember;
  channels: OrderedMap<Id, ChannelWithMember>;
  isCurrent: boolean;
  channelId?: string;
}

const SpaceItem = React.memo<SpaceItemProps>(({ space, member, channels, channelId }) => {
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

interface Props {
  open: boolean;
  my: My;
  channelId?: string;
  spaceId?: string;
}

export const Sidebar = React.memo<Props>(({ my, open }) => {
  const channel = useChannel();
  if (!open) {
    return null;
  }
  const spaceList = my.spaces
    .valueSeq()
    .map(({ space, member }) => (
      <SpaceItem
        key={space.id}
        space={space}
        member={member}
        channels={my.channels}
        channelId={channel?.id}
        isCurrent={channel?.spaceId === space.id}
      />
    ));
  return (
    <div className="w-48 fixed pb-2 md:static bg-gray-200 md:h-full md:overflow-y-scroll border-r border-b md:border-b-0 shadow-lg md:shadow-none">
      <ul>{spaceList}</ul>

      <div className="mt-4 mx-2">
        <CreateSpace />
      </div>
    </div>
  );
});
