import React from 'react';
import { My } from '../states/states';
import { useChannel } from './Provider';
import { SpaceItem } from './sidebar/SpaceItem';

interface Props {
  my: My;
}

export const SpaceList = React.memo<Props>(({ my }) => {
  const channel = useChannel();
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
  return <ul>{spaceList}</ul>;
});
