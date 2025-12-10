import { css } from '@emotion/react';
import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { type Channel } from '../../api/channels';
import { type Space } from '../../api/spaces';
import BellSlashSolid from '../../assets/icons/bell-slash-solid.svg';
import BellSolid from '../../assets/icons/bell-solid.svg';
import HelpIcon from '../../assets/icons/help.svg';
import NightSky from '../../assets/icons/night-sky.svg';
import { useNotificationSwitch } from '../../states/notify';
import { mB, pY } from '../../styles/atoms';
import { chatPath } from '../../utils/path';
import Icon from '../atoms/Icon';
import Menu from '../atoms/Menu';
import { MenuItemLink } from '../atoms/MenuItem';
import Overlay from '../atoms/Overlay';
import ChatHeaderButton, { ChatHeaderButtonNavLink, sidebarIconButton } from './ChatHeaderButton';
import Help from './Help';
import UserStatusButton from './UserStatusButton';

interface Props {
  space: Space;
  channels: Channel[];
}

const footer = css`
  flex: 1 1 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  ${[pY(2)]};
`;

function SidebarFoldedItems({ space, channels }: Props) {
  const [channelMenu, setChannelMenu] = useState(false);
  const [helpDialog, setHelpDialog] = useState(false);
  const [memberList, setMemberList] = useState(false);
  const { stopNotify, startNotify, canNotify } = useNotificationSwitch();
  const channelButton = useRef<HTMLButtonElement>(null);
  const toggleMenu = () => setChannelMenu((value) => !value);
  const toggleMemberList = useCallback(() => setMemberList((memberList) => !memberList), []);
  const dismissMenu = () => setChannelMenu(false);
  return (
    <React.Fragment>
      <ChatHeaderButtonNavLink
        className={({ isActive }) => (isActive ? 'active' : '')}
        end
        css={[mB(1), sidebarIconButton]}
        to={chatPath(space.id)}
      >
        <Icon icon={NightSky} />
      </ChatHeaderButtonNavLink>
      <ChatHeaderButton ref={channelButton} css={[mB(1), sidebarIconButton]} onClick={toggleMenu}>
        #
      </ChatHeaderButton>
      <UserStatusButton
        spaceId={space.id}
        folded
        css={[sidebarIconButton, mB(1)]}
        active={false}
        toggle={toggleMemberList}
      />
      <ChatHeaderButton
        data-active={canNotify}
        css={[sidebarIconButton]}
        onClick={canNotify ? stopNotify : startNotify}
      >
        <Icon icon={canNotify ? BellSolid : BellSlashSolid} />
      </ChatHeaderButton>
      <div css={footer}>
        <ChatHeaderButton onClick={() => setHelpDialog(true)} css={[sidebarIconButton]}>
          <Icon icon={HelpIcon} />
        </ChatHeaderButton>
      </div>
      {channelMenu && (
        <Overlay anchor={channelButton} x={1} y={-1} selfY={1} onOuter={dismissMenu}>
          <Menu dismiss={dismissMenu}>
            {channels.map((channel) => (
              <MenuItemLink key={channel.id} to={chatPath(space.id, channel.id)}>
                {channel.name}
              </MenuItemLink>
            ))}
          </Menu>
        </Overlay>
      )}
      {helpDialog && <Help dismiss={() => setHelpDialog(false)} />}
    </React.Fragment>
  );
}

export default SidebarFoldedItems;
