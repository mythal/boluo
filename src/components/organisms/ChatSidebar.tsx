import * as React from 'react';
import { useState } from 'react';
import { css } from '@emotion/core';
import { Channel } from '@/api/channels';
import { chatHeaderPadding, chatSidebarColor, headerBgColor, mR, sidebarWidth, textLg } from '@/styles/atoms';
import ChatHeaderButton, { ChatHeaderButtonLink } from '@/components/atoms/ChatHeaderButton';
import sidebarFold from '../../assets/icons/sidebar-fold.svg';
import sidebarExpand from '../../assets/icons/sidebar-expand.svg';
import logo from '../../assets/logo.svg';
import Icon from '@/components/atoms/Icon';
import { darken } from 'polished';
import { Space } from '@/api/spaces';
import SidebarExpandItems from '@/components/molecules/SidebarExpandItems';

interface Props {
  space: Space;
  channels: Channel[];
}

const sidebarBody = css`
  background-color: ${chatSidebarColor};
  grid-area: sidebar-body;
  border-right: 1px solid ${darken(0.04, chatSidebarColor)};
  min-width: 0;
  transition: all 100ms ease-in-out;
  &[data-expand='true'] {
    ${sidebarWidth};
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

function ChatSidebar({ space, channels }: Props) {
  const SIDEBAR_KEY = 'expand-sidebar';
  const [expand, setExpand] = useState(Boolean(localStorage.getItem(SIDEBAR_KEY)));
  const toggle = () =>
    setExpand((value) => {
      if (value) {
        localStorage.removeItem(SIDEBAR_KEY);
      } else {
        localStorage.setItem(SIDEBAR_KEY, 'true');
      }
      return !value;
    });
  return (
    <React.Fragment>
      <div css={sidebarHeader}>
        <ChatHeaderButton onClick={toggle} css={[textLg]}>
          <Icon sprite={expand ? sidebarFold : sidebarExpand} />
        </ChatHeaderButton>
        {expand && (
          <ChatHeaderButtonLink to="/" css={[spaceLinkStyle]}>
            <Icon sprite={logo} />
            菠萝
          </ChatHeaderButtonLink>
        )}
      </div>
      <div css={sidebarBody} data-expand={expand}>
        {expand && <SidebarExpandItems space={space} channels={channels} />}
      </div>
    </React.Fragment>
  );
}

export default ChatSidebar;
