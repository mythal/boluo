import React from 'react';
import { useMe, useMy } from '../App/App';
import { GUEST } from '../App/states';
import { SidebarSpaceItem } from './SidebarSpaceItem';
import { Id } from '../id';

interface Props {
  spaceId?: Id;
  channelId?: Id;
}

export const Sidebar: React.FC<Props> = ({ channelId, spaceId }) => {
  const me = useMe();
  const { mySpaces, myChannels } = useMy();

  if (me === GUEST) {
    return null;
  }
  if (channelId) {
    spaceId = myChannels.get(channelId)?.channel.spaceId;
  }

  const myChannelsSeq = myChannels.valueSeq();
  const list = mySpaces.valueSeq().map(({ space, member }) => (
    <li key={space.id}>
      <SidebarSpaceItem
        space={space}
        member={member}
        channels={myChannelsSeq}
        currentSpace={spaceId}
        currentChannel={channelId}
      />
    </li>
  ));
  return <ul className="h-screen bg-teal-900">{list}</ul>;
};
