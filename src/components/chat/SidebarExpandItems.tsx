import * as React from 'react';
import { useState } from 'react';
import { Space } from '../../api/spaces';
import { Channel } from '../../api/channels';
import styled from '@emotion/styled';
import { fontBold, fontMono, mB, mT, pR, pX, pY, textBase, textSm } from '../../styles/atoms';
import { SidebarItemLink } from '../atoms/SidebarItem';
import { encodeUuid } from '../../utils/id';
import { chatPath } from '../../utils/path';
import Icon from '../atoms/Icon';
import plus from '../../assets/icons/plus-circle.svg';
import { SidebarButton } from '../atoms/SidebarButton';
import CreateChannel from '../organisms/CreateChannel';
import { useSelector } from '../../store';
import { gray, sidebarItemActiveBgColor, sidebarItemHoverBgColor, textColor } from '../../styles/colors';
import { NavLink } from 'react-router-dom';
import { css } from '@emotion/core';

interface Props {
  space: Space;
  channels: Channel[];
}

const SidebarSectionTitle = styled.h3`
  ${[textBase, textSm, fontBold, mT(2), mB(2), pX(8), pR(2)]};
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
  ${[fontBold, pY(4), pX(8)]};
  color: ${textColor};
  text-decoration: none;
  display: flex;
  align-items: center;

  &:hover {
    background-color: ${sidebarItemHoverBgColor};
  }

  &.active,
  &:active {
    background-color: ${sidebarItemActiveBgColor};
  }
`;

const SpaceName = styled.span``;

function SidebarExpandItems({ space, channels }: Props) {
  const [createChannel, setCreateChannel] = useState(false);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(space.id)?.member.isAdmin);
  return (
    <React.Fragment>
      <NavLink css={sidebarTitle} exact activeClassName="active" to={`/chat/${encodeUuid(space.id)}`}>
        <SpaceName>{space.name}</SpaceName>
      </NavLink>
      <SidebarSectionTitle>
        <span>频道</span>
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
