import React, { useState } from 'react';
import { My } from '../states/states';
import { Space, SpaceMember } from '../api/spaces';
import { Channel, ChannelMember, ChannelWithMember } from '../api/channels';
import { List, OrderedMap } from 'immutable';
import { Id } from '../id';
import { Link, useHistory } from 'react-router-dom';
import { CaretRightIcon, DownIcon, RightIcon } from './icons';
import { CreateSpace } from './CreateSpace';

interface ChannelItemProps {
  channel: Channel;
  member: ChannelMember;
  channelId?: string;
}

const ChannelItem: React.FC<ChannelItemProps> = ({ channel, member, channelId }) => {
  return (
    <li>
      <Link draggable={false} className="channel-item" to={`/channel/${channel.id}`}>
        {channel.name}
      </Link>
    </li>
  );
};

interface SpaceItemProps {
  space: Space;
  member: SpaceMember;
  channels: OrderedMap<Id, ChannelWithMember>;
  spaceId?: string;
  channelId?: string;
}

const SpaceItem: React.FC<SpaceItemProps> = ({ space, member, channels, channelId }) => {
  const history = useHistory();
  const [fold, setFold] = useState(false);
  const Icon = fold ? RightIcon : DownIcon;
  const enterSpace: React.MouseEventHandler = e => {
    e.stopPropagation();
    history.push(`/space/${space.id}`);
  };
  const channelList = fold
    ? List()
    : channels
        .filter(({ channel }) => channel.spaceId === space.id)
        .map(({ channel, member }) => (
          <ChannelItem key={channel.id} channel={channel} member={member} channelId={channelId} />
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
        <span className="flex-grow inline-block">{space.name}</span>
        <button className="opacity-0 group-hover:opacity-100 btn py-0 px-2 text-xs rounded" onClick={enterSpace}>
          <CaretRightIcon />
        </button>
      </div>

      <ul hidden={fold}>{channelList}</ul>
    </li>
  );
};

interface Props {
  open: boolean;
  my: My;
  channelId?: string;
  spaceId?: string;
}

export const Sidebar: React.FC<Props> = ({ my, open }) => {
  const spaceList = my.spaces
    .valueSeq()
    .map(({ space, member }) => <SpaceItem key={space.id} space={space} member={member} channels={my.channels} />);
  return (
    <div className="w-1/4 md:w-48 bg-gray-200 h-full overflow-y-scroll border-r" hidden={!open}>
      <ul>{spaceList}</ul>

      <div className="mt-4 mx-2">
        <CreateSpace />
      </div>
    </div>
  );
};
