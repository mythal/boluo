import { css } from '@emotion/react';
import styled from '@emotion/styled';
import * as React from 'react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { type Channel } from '../../api/channels';
import { type Space } from '../../api/spaces';
import BellSlashSolid from '../../assets/icons/bell-slash-solid.svg';
import BellSolid from '../../assets/icons/bell-solid.svg';
import HelpIcon from '../../assets/icons/help.svg';
import PlusCircle from '../../assets/icons/plus-circle.svg';
import { useNotificationSwitch } from '../../states/notify';
import { useSelector } from '../../store';
import {
  fontBold,
  fontMono,
  mB,
  mR,
  mT,
  p,
  pR,
  pX,
  pY,
  textBase,
  textSm,
} from '../../styles/atoms';
import {
  gray,
  sidebarItemActiveBgColor,
  sidebarItemHoverBgColor,
  textColor,
} from '../../styles/colors';
import { encodeUuid } from '../../utils/id';
import { chatPath } from '../../utils/path';
import Icon from '../atoms/Icon';
import { SidebarButton } from '../atoms/SidebarButton';
import { SidebarItemLink } from '../atoms/SidebarItem';
import CreateChannel from '../organisms/CreateChannel';
import ChatHeaderButton from './ChatHeaderButton';
import Help from './Help';
import { SidebarChannelItem } from './SidebarChannelItem';
import { SidebarConnectionDisplay } from './SidebarConnectionDisplay';

interface Props {
  space: Space;
  channels: Channel[];
}

const SidebarSectionTitle = styled.h3`
  ${[textBase, textSm, fontBold, mT(2), mB(2), pX(8), pR(2)]};
  display: flex;
  justify-content: space-between;
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
`;

const SpaceName = styled.span``;

const footer = css`
  flex: 1 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  ${p(2)};
`;

const channelList = css`
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
`;

function SidebarExpandItems({ space, channels }: Props) {
  const [createChannel, setCreateChannel] = useState(false);
  const [helpDialog, setHelpDialog] = useState(false);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(space.id)?.member.isAdmin);
  const { canNotify, stopNotify, startNotify } = useNotificationSwitch();
  return (
    <React.Fragment>
      <SidebarConnectionDisplay />
      <NavLink
        css={sidebarTitle}
        style={({ isActive }) =>
          isActive ? { backgroundColor: sidebarItemActiveBgColor } : undefined
        }
        end
        to={`/chat/${encodeUuid(space.id)}`}
      >
        <SpaceName>{space.name}</SpaceName>
      </NavLink>
      <SidebarSectionTitle>
        <span>频道</span>
        <div>
          <SidebarButton data-active={canNotify} onClick={canNotify ? stopNotify : startNotify}>
            <Icon icon={canNotify ? BellSolid : BellSlashSolid} />
          </SidebarButton>
          {isSpaceAdmin && (
            <SidebarButton onClick={() => setCreateChannel(true)}>
              <Icon icon={PlusCircle} />
            </SidebarButton>
          )}
        </div>
      </SidebarSectionTitle>
      <div css={channelList}>
        {channels.map((channel) => (
          <SidebarChannelItem channel={channel} key={channel.id} />
        ))}
      </div>
      <div css={footer}>
        <ChatHeaderButton css={[textBase]} onClick={() => setHelpDialog(true)}>
          <Icon icon={HelpIcon} /> 格式
        </ChatHeaderButton>
      </div>

      {createChannel && <CreateChannel space={space} dismiss={() => setCreateChannel(false)} />}
      {helpDialog && <Help dismiss={() => setHelpDialog(false)} />}
    </React.Fragment>
  );
}

export default React.memo(SidebarExpandItems);
