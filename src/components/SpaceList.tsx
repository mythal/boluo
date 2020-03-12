import React from 'react';
import { useChannel } from './Provider';
import { SpaceItem } from './sidebar/SpaceItem';
import { ProfileState } from '../reducers/profile';

interface Props {
  profile: ProfileState;
}

export const SpaceList = React.memo<Props>(({ profile }) => {
  const channel = useChannel();
  const spaceList = profile.spaces
    .valueSeq()
    .map(({ space, member }) => (
      <SpaceItem
        key={space.id}
        space={space}
        member={member}
        channels={profile.channels}
        channelId={channel?.id}
        isCurrent={channel?.spaceId === space.id}
      />
    ));
  return <ul>{spaceList}</ul>;
});
