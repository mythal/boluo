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

interface Props {
  space: Space;
  channels: Channel[];
}

function SidebarFoldedItems({ space, channels }: Props) {
  const [channelMenu, setChannelMenu] = useState(false);
  const channelButton = useRef<HTMLButtonElement>(null);
  const toggleMenu = () => setChannelMenu((value) => !value);
  const dismissMenu = () => setChannelMenu(false);
  return (
    <React.Fragment>
      <ChatHeaderButtonNavLink activeClassName="active" exact css={sidebarIconButton} to={chatPath(space.id)}>
        <Icon sprite={nightSky} />
      </ChatHeaderButtonNavLink>
      <ChatHeaderButton ref={channelButton} css={sidebarIconButton} onClick={toggleMenu}>
        #
      </ChatHeaderButton>
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
    </React.Fragment>
  );
}

export default SidebarFoldedItems;
