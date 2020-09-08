import * as React from 'react';
import { useState } from 'react';
import { css } from '@emotion/core';
import { Channel } from '../../api/channels';
import { chatHeaderPadding, mR, pT, sidebarWidth, textLg } from '../../styles/atoms';
import ChatHeaderButton, { ChatHeaderButtonLink } from './ChatHeaderButton';
import logo from '../../assets/logo.svg';
import bars from '../../assets/icons/bars.svg';
import Icon from '../atoms/Icon';
import { darken } from 'polished';
import { Space } from '../../api/spaces';
import SidebarExpandItems from './SidebarExpandItems';
import { chatSidebarColor, headerBgColor } from '../../styles/colors';
import { Transition } from 'react-transition-group';
import SidebarFoldedItems from './SidebarFoldedItems';

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

function Sidebar({ space, channels }: Props) {
  const [expand, setExpand] = useState(sidebarState());
  const toggle = () =>
    setExpand((value) => {
      if (value) {
        localStorage.setItem(SIDEBAR_KEY, 'false');
      } else {
        localStorage.setItem(SIDEBAR_KEY, 'true');
      }
      return !value;
    });
  return (
    <React.Fragment>
      <Transition in={expand} timeout={300}>
        {(state) => (
          <React.Fragment>
            <div css={sidebarHeader}>
              <ChatHeaderButton onClick={toggle} css={[textLg]} data-active={expand}>
                <Icon sprite={bars} />
              </ChatHeaderButton>
              {state === 'entered' && (
                <ChatHeaderButtonLink to="/" css={[spaceLinkStyle]}>
                  <Icon sprite={logo} />
                  菠萝
                </ChatHeaderButtonLink>
              )}
            </div>
            <div css={sidebarBody} data-state={state}>
              {state === 'entered' && <SidebarExpandItems space={space} channels={channels} />}
              {state === 'exited' && <SidebarFoldedItems space={space} channels={channels} />}
            </div>
          </React.Fragment>
        )}
      </Transition>
    </React.Fragment>
  );
}

export default Sidebar;
