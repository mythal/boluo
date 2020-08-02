import * as React from 'react';
import { useState } from 'react';
import { Space } from '@/api/spaces';
import { Channel } from '@/api/channels';
import styled from '@emotion/styled';
import { fontBold, mY, pL, pR, textBase, textColor } from '@/styles/atoms';
import { SidebarItemLink } from '@/components/atoms/SidebarItem';
import { encodeUuid } from '@/utils/id';
import { channelChatPath } from '@/utils/path';
import Icon from '@/components/atoms/Icon';
import plus from '@/assets/icons/plus-circle.svg';
import { SidebarButton } from '@/components/atoms/SidebarButton';
import { darken } from 'polished';
import CreateChannel from '@/components/organisms/CreateChannel';
import { useSelector } from '@/store';

interface Props {
  space: Space;
  channels: Channel[];
}

const SidebarSectionTitle = styled.h3`
  ${[textBase, fontBold, mY(2), pL(8), pR(2)]};
  display: flex;
  justify-content: space-between;
`;

const ChannelName = styled.span`
  position: relative;
  &::before {
    content: '#';
    font-family: monospace;
    position: absolute;
    left: -1em;

    color: ${darken(0.5, textColor)};
  }
`;

function SidebarExpandItems({ space, channels }: Props) {
  const [createChannel, setCreateChannel] = useState(false);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(space.id)?.member.isAdmin);
  return (
    <React.Fragment>
      <SidebarItemLink exact activeClassName="active" to={`/chat/${encodeUuid(space.id)}`}>
        {space.name}
      </SidebarItemLink>
      <SidebarSectionTitle>
        频道
        {isSpaceAdmin && (
          <SidebarButton onClick={() => setCreateChannel(true)}>
            <Icon sprite={plus} />
          </SidebarButton>
        )}
      </SidebarSectionTitle>
      {channels.map((channel) => (
        <SidebarItemLink key={channel.id} to={channelChatPath(channel.spaceId, channel.id)}>
          <ChannelName>{channel.name}</ChannelName>
        </SidebarItemLink>
      ))}

      {createChannel && <CreateChannel space={space} dismiss={() => setCreateChannel(false)} />}
    </React.Fragment>
  );
}

export default React.memo(SidebarExpandItems);
