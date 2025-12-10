import { css } from '@emotion/react';
import { darken } from 'polished';
import * as React from 'react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { type Channel } from '../../api/channels';
import { type Space } from '../../api/spaces';
import Bars from '../../assets/icons/bars.svg';
import Logo from '../../assets/logo.svg';
import { useSelector } from '../../store';
import { mR, pT, textLg } from '../../styles/atoms';
import { chatSidebarColor, headerBgColor } from '../../styles/colors';
import Icon from '../atoms/Icon';
import ChatHeaderButton, { ChatHeaderButtonLink } from './ChatHeaderButton';
import SidebarExpandItems from './SidebarExpandItems';
import SidebarFoldedItems from './SidebarFoldedItems';
import SidebarMemberList from './SidebarMemberList';
import { chatHeaderPadding, sidebarWidth } from './styles';
import UserStatusButton from './UserStatusButton';

interface Props {
  space: Space;
  channels: Channel[];
}

const sidebarBody = css`
  background-color: ${chatSidebarColor};
  grid-area: sidebar-body;
  border-right: 1px solid ${darken(0.04, chatSidebarColor)};
  min-width: 0;
  display: flex;
  flex-direction: column;
  transition: all 300ms ease-in-out;
  &[data-state='entering'],
  &[data-state='entered'] {
    ${sidebarWidth};
  }
  &[data-state='exited'] {
    ${pT(4)};
    text-align: center;
    align-items: center;
  }
`;

const sidebarHeader = css`
  background-color: ${headerBgColor};
  grid-area: sidebar-header;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  ${[chatHeaderPadding]};
`;

const spaceLinkStyle = css`
  max-width: 100px;
  ${mR(1)};
`;

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
      <div css={sidebarHeader}>
        <ChatHeaderButton onClick={toggle} css={[textLg]} data-active={expand}>
          <Icon icon={Bars} />
        </ChatHeaderButton>
        {state === 'entered' && (
          <Fragment>
            <UserStatusButton spaceId={space.id} active={showMember} toggle={toggleShowMember} />
            <ChatHeaderButtonLink to="/" css={[spaceLinkStyle]}>
              <Icon icon={Logo} />
              菠萝
            </ChatHeaderButtonLink>
          </Fragment>
        )}
      </div>
      <div css={sidebarBody} data-state={state}>
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
