import * as React from 'react';
import { useState } from 'react';
import { Space } from '@/api/spaces';
import { Channel } from '@/api/channels';
import styled from '@emotion/styled';
import { fontBold, fontMono, mR, mY, pL, pR, pY, textBase, textXl } from '@/styles/atoms';
import { SidebarItemLink } from '@/components/atoms/SidebarItem';
import { encodeUuid } from '@/utils/id';
import { chatPath } from '@/utils/path';
import Icon from '@/components/atoms/Icon';
import plus from '@/assets/icons/plus-circle.svg';
import nightSky from '../../assets/icons/night-sky.svg';
import { SidebarButton } from '@/components/atoms/SidebarButton';
import { darken } from 'polished';
import CreateChannel from '@/components/organisms/CreateChannel';
import { useSelector } from '@/store';
import { gray, textColor } from '@/styles/colors';
import { NavLink } from 'react-router-dom';
import { css } from '@emotion/core';

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
    ${fontMono};
    position: absolute;
    left: -1em;

    color: ${gray['500']};
  }
`;

const sidebarTitle = css`
  ${[textXl, pY(4), pL(8)]};
  color: ${textColor};
  text-decoration: none;
  display: flex;
  align-items: center;

  &:hover {
    background-color: ${gray['700']};
  }

  &.active,
  &:active {
    background-color: ${darken(0.1, gray['700'])};
  }
`;

function SidebarExpandItems({ space, channels }: Props) {
  const [createChannel, setCreateChannel] = useState(false);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(space.id)?.member.isAdmin);
  return (
    <React.Fragment>
      <NavLink css={sidebarTitle} exact activeClassName="active" to={`/chat/${encodeUuid(space.id)}`}>
        <Icon css={mR(2)} sprite={nightSky} />
        {space.name}
      </NavLink>
      <SidebarSectionTitle>
        频道
        {isSpaceAdmin && (
          <SidebarButton onClick={() => setCreateChannel(true)}>
            <Icon sprite={plus} />
          </SidebarButton>
        )}
      </SidebarSectionTitle>
      {channels.map((channel) => (
        <SidebarItemLink key={channel.id} to={chatPath(channel.spaceId, channel.id)}>
          <ChannelName>{channel.name}</ChannelName>
        </SidebarItemLink>
      ))}

      {createChannel && <CreateChannel space={space} dismiss={() => setCreateChannel(false)} />}
    </React.Fragment>
  );
}

export default React.memo(SidebarExpandItems);
