import * as React from 'react';
import { useCallback, useState } from 'react';
import { css } from '@emotion/core';
import { useDispatch, useSelector } from '../../store';
import {
  chatHeaderStyle,
  chatHeaderToolbar,
  flex,
  fontBold,
  fontMono,
  mL,
  mR,
  pR,
  textBase,
  textLg,
} from '../../styles/atoms';
import ChannelMemberButton from './ChannelMemberButton';
import sliders from '../../assets/icons/sliders.svg';
import columns from '../../assets/icons/columns.svg';
import ChatHeaderButton from './ChatHeaderButton';
import Icon from '../atoms/Icon';
import ManageChannel from './ManageChannel';
import styled from '@emotion/styled';
import { darken } from 'polished';
import Filter from './Filter';
import MemberListButton from './MemberListButton';
import { textColor } from '../../styles/colors';
import { useTitle } from '../../hooks/useTitle';
import { usePane } from '../../hooks/usePane';

const Topic = styled.div`
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  grid-area: topic;
  color: ${darken(0.2, textColor)};
`;

const toolbar = css`
  ${[flex, chatHeaderToolbar]};
  align-items: stretch;
`;

const ChannelName = styled.div`
  ${[textBase, fontBold, textLg]};
  color: ${textColor};
  ${pR(1)};
  ${mR(1)};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 6em;

  &::before {
    content: '#';
    ${fontMono};
    color: ${darken(0.2, textColor)};
    ${[pR(1)]};
  }
`;

function Header() {
  const pane = usePane();
  const channel = useSelector((state) => state.chatPane[pane]!.channel);
  const isPaneSplit = useSelector((state) => state.splitPane);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(channel.spaceId)?.member.isAdmin);
  const [managePanel, setManagePanel] = useState(false);
  const dispatch = useDispatch();
  const toggleSplit = useCallback(() => dispatch({ type: 'SPLIT_PANE', split: !isPaneSplit }), [isPaneSplit, dispatch]);
  useTitle(channel.name);
  return (
    <div css={chatHeaderStyle}>
      <ChannelName>{channel.name}</ChannelName>
      <Topic>{channel.topic}</Topic>
      <div css={toolbar}>
        <ChatHeaderButton css={[mL(1)]} data-active={isPaneSplit} onClick={toggleSplit}>
          <Icon sprite={columns} />
        </ChatHeaderButton>
        {isSpaceAdmin && (
          <ChatHeaderButton css={[mL(1)]} onClick={() => setManagePanel(true)}>
            <Icon sprite={sliders} />
          </ChatHeaderButton>
        )}
        <Filter css={[mL(1)]} />
        <MemberListButton channelId={channel.id} css={[mL(1)]} />
        <ChannelMemberButton css={mL(1)} />
      </div>
      {managePanel && <ManageChannel channel={channel} dismiss={() => setManagePanel(false)} />}
    </div>
  );
}

export default Header;
