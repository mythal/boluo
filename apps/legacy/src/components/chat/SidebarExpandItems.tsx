import * as React from 'react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { type Channel } from '../../api/channels';
import { type Space } from '../../api/spaces';
import BellSlashSolid from '@boluo/icons/legacy/BellSlashSolid';
import BellSolid from '@boluo/icons/legacy/BellSolid';
import HelpIcon from '@boluo/icons/legacy/Help';
import PlusCircle from '@boluo/icons/legacy/PlusCircle';
import { useNotificationSwitch } from '../../states/notify';
import { useSelector } from '../../store';
import { encodeUuid } from '../../utils/id';
import Icon from '../atoms/Icon';
import { SidebarButton } from '../atoms/SidebarButton';
import CreateChannel from '../organisms/CreateChannel';
import ChatHeaderButton from './ChatHeaderButton';
import Help from './Help';
import { SidebarChannelItem } from './SidebarChannelItem';
import { SidebarConnectionDisplay } from './SidebarConnectionDisplay';

interface Props {
  space: Space;
  channels: Channel[];
}

function SidebarExpandItems({ space, channels }: Props) {
  const [createChannel, setCreateChannel] = useState(false);
  const [helpDialog, setHelpDialog] = useState(false);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(space.id)?.member.isAdmin);
  const { canNotify, stopNotify, startNotify } = useNotificationSwitch();
  return (
    <React.Fragment>
      <SidebarConnectionDisplay />
      <NavLink
        className="text-legacy-text hover:bg-legacy-sidebar-item-hover-background aria-[current=page]:bg-legacy-sidebar-item-active-background flex items-center px-8 py-4 font-bold no-underline"
        end
        to={`/chat/${encodeUuid(space.id)}`}
      >
        <span>{space.name}</span>
      </NavLink>
      <h3 className="legacy-sidebar-section-title flex justify-between px-8 pr-2 text-[0.875rem] font-bold">
        <span>频道</span>
        <div>
          <SidebarButton
            aria-label={canNotify ? '关闭通知' : '开启通知'}
            data-active={canNotify}
            onClick={canNotify ? stopNotify : startNotify}
          >
            <Icon icon={canNotify ? BellSolid : BellSlashSolid} />
          </SidebarButton>
          {isSpaceAdmin && (
            <SidebarButton aria-label="创建频道" onClick={() => setCreateChannel(true)}>
              <Icon icon={PlusCircle} />
            </SidebarButton>
          )}
        </div>
      </h3>
      <div className="h-full overflow-x-hidden overflow-y-auto">
        {channels.map((channel) => (
          <SidebarChannelItem channel={channel} key={channel.id} />
        ))}
      </div>
      <div className="flex w-full flex-1 items-end justify-end p-2">
        <ChatHeaderButton onClick={() => setHelpDialog(true)} className="text-[1rem]">
          <Icon icon={HelpIcon} /> 格式
        </ChatHeaderButton>
      </div>

      {createChannel && <CreateChannel space={space} dismiss={() => setCreateChannel(false)} />}
      {helpDialog && <Help dismiss={() => setHelpDialog(false)} />}
    </React.Fragment>
  );
}

export default React.memo(SidebarExpandItems);
