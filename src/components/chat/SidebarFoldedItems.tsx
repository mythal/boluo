import * as React from 'react';
import { useRef, useState } from 'react';
import ChatHeaderButton, { ChatHeaderButtonNavLink, sidebarIconButton } from './ChatHeaderButton';
import { Space } from '../../api/spaces';
import Icon from '../atoms/Icon';
import nightSky from '../../assets/icons/night-sky.svg';
import Menu from '../atoms/Menu';
import { MenuItemLink } from '../atoms/MenuItem';
import { Channel } from '../../api/channels';
import Overlay from '../atoms/Overlay';
import { chatPath } from '../../utils/path';
import Help from './Help';
import help from '../../assets/icons/help.svg';
import { css } from '@emotion/core';
import { mB, pY } from '../../styles/atoms';
import { sidebarButtonPrimary } from './styles';

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
  const channelButton = useRef<HTMLButtonElement>(null);
  const toggleMenu = () => setChannelMenu((value) => !value);
  const dismissMenu = () => setChannelMenu(false);
  return (
    <React.Fragment>
      <ChatHeaderButtonNavLink activeClassName="active" exact css={[mB(1), sidebarIconButton]} to={chatPath(space.id)}>
        <Icon sprite={nightSky} />
      </ChatHeaderButtonNavLink>
      <ChatHeaderButton ref={channelButton} css={[mB(1), sidebarIconButton]} onClick={toggleMenu}>
        #
      </ChatHeaderButton>
      <div css={footer}>
        <ChatHeaderButton onClick={() => setHelpDialog(true)} css={[sidebarIconButton, sidebarButtonPrimary]}>
          <Icon sprite={help} />
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
