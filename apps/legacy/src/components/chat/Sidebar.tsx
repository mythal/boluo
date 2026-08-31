import * as React from 'react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { type Channel } from '../../api/channels';
import { type Space } from '../../api/spaces';
import Bars from '@boluo/icons/legacy/Bars';
import Logo from '@boluo/icons/legacy/Logo';
import { useSelector } from '../../store';
import { cls } from '../../utils/classnames';
import Icon from '../atoms/Icon';
import ChatHeaderButton, { ChatHeaderButtonLink } from './ChatHeaderButton';
import SidebarExpandItems from './SidebarExpandItems';
import SidebarFoldedItems from './SidebarFoldedItems';
import SidebarMemberList from './SidebarMemberList';
import UserStatusButton from './UserStatusButton';

interface Props {
  space: Space;
  channels: Channel[];
}

const sidebarBodyClassName =
  'flex min-w-0 flex-col [grid-area:sidebar-body] border-r border-legacy-sidebar-border bg-legacy-chat-sidebar transition-all duration-300 ease-in-out';

const SIDEBAR_KEY = 'sidebar-state';

function sidebarState(): boolean {
  const sidebarState = localStorage.getItem(SIDEBAR_KEY);
  if (sidebarState === 'true') {
    return true;
  } else if (sidebarState === 'false') {
    return false;
  } else {
    localStorage.setItem(SIDEBAR_KEY, 'true');
    return true;
  }
}

const useVisibleChannels = (channels: Channel[], imAdmin: boolean): Channel[] => {
  const myMembers = useSelector((state) => state.profile?.channels);
  return useMemo(() => {
    const channelList: typeof channels = [];
    for (const channel of channels) {
      if (channel.isPublic || (myMembers && myMembers.has(channel.id)) || imAdmin) {
        channelList.push(channel);
      }
    }
    return channelList;
  }, [channels, myMembers, imAdmin]);
};

function Sidebar({ space, channels }: Props) {
  const [expand, setExpand] = useState(sidebarState());
  const [showMember, setShowMember] = useState(false);
  const toggle = () =>
    setExpand((value) => {
      if (value) {
        localStorage.setItem(SIDEBAR_KEY, 'false');
      } else {
        localStorage.setItem(SIDEBAR_KEY, 'true');
      }
      return !value;
    });
  const toggleShowMember = useCallback(() => {
    setShowMember((showMember) => !showMember);
  }, []);
  const imAdmin = useSelector((state) => {
    const profile = state.profile;
    if (!profile) {
      return false;
    }
    const spaceWithMember = profile.spaces.get(space.id);
    if (!spaceWithMember) {
      return false;
    }
    return spaceWithMember.member.isAdmin;
  });
  const channelList = useVisibleChannels(channels, imAdmin);
  const state = expand ? 'entered' : 'exited';
  return (
    <React.Fragment>
      <div className="bg-legacy-header-background flex items-stretch justify-between px-2 py-1.5 [grid-area:sidebar-header]">
        <ChatHeaderButton
          aria-label={expand ? '折叠侧栏' : '展开侧栏'}
          className="text-[1.125rem]"
          onClick={toggle}
          data-active={expand}
        >
          <Icon icon={Bars} />
        </ChatHeaderButton>
        {state === 'entered' && (
          <Fragment>
            <UserStatusButton spaceId={space.id} active={showMember} toggle={toggleShowMember} />
            <ChatHeaderButtonLink to="/" className="mr-1 max-w-[100px]">
              <Icon icon={Logo} />
              菠萝
            </ChatHeaderButtonLink>
          </Fragment>
        )}
      </div>
      <div
        className={cls(
          sidebarBodyClassName,
          state === 'entered' ? 'w-[200px]' : 'items-center pt-4 text-center',
        )}
        data-state={state}
      >
        {state === 'entered' &&
          (showMember ? (
            <SidebarMemberList spaceId={space.id} />
          ) : (
            <SidebarExpandItems space={space} channels={channelList} />
          ))}
        {state === 'exited' && <SidebarFoldedItems space={space} channels={channelList} />}
      </div>
    </React.Fragment>
  );
}

export default Sidebar;
