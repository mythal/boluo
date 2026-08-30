import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { type Channel } from '../../api/channels';
import { type Space } from '../../api/spaces';
import BellSlashSolid from '@boluo/icons/legacy/BellSlashSolid';
import BellSolid from '@boluo/icons/legacy/BellSolid';
import HelpIcon from '@boluo/icons/legacy/Help';
import NightSky from '@boluo/icons/legacy/NightSky';
import { useNotificationSwitch } from '../../states/notify';
import { chatPath } from '../../utils/path';
import Icon from '../atoms/Icon';
import Menu from '../atoms/Menu';
import { MenuItemLink } from '../atoms/MenuItem';
import Overlay from '../atoms/Overlay';
import ChatHeaderButton, {
  ChatHeaderButtonNavLink,
  sidebarIconButtonClassName,
} from './ChatHeaderButton';
import Help from './Help';
import UserStatusButton from './UserStatusButton';

interface Props {
  space: Space;
  channels: Channel[];
}

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
        aria-label="位面首页"
        className={`${sidebarIconButtonClassName} mb-1`}
        end
        to={chatPath(space.id)}
      >
        <Icon icon={NightSky} />
      </ChatHeaderButtonNavLink>
      <ChatHeaderButton
        aria-label="选择频道"
        className={`${sidebarIconButtonClassName} legacy-sidebar-icon-spaced`}
        ref={channelButton}
        onClick={toggleMenu}
      >
        #
      </ChatHeaderButton>
      <UserStatusButton
        spaceId={space.id}
        folded
        className={`${sidebarIconButtonClassName} legacy-sidebar-icon-spaced`}
        active={false}
        toggle={toggleMemberList}
      />
      <ChatHeaderButton
        aria-label={canNotify ? '关闭通知' : '开启通知'}
        data-active={canNotify}
        className={sidebarIconButtonClassName}
        onClick={canNotify ? stopNotify : startNotify}
      >
        <Icon icon={canNotify ? BellSolid : BellSlashSolid} />
      </ChatHeaderButton>
      <div className="flex flex-[1_1_100%] items-end justify-center py-2">
        <ChatHeaderButton
          aria-label="查看格式帮助"
          onClick={() => setHelpDialog(true)}
          className={sidebarIconButtonClassName}
        >
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
