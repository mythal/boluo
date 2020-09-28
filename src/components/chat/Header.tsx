import * as React from 'react';
import { useCallback, useState } from 'react';
import { css } from '@emotion/core';
import { useDispatch, useSelector } from '../../store';
import {
  breakpoint,
  flex,
  fontBold,
  fontMono,
  fontNormal,
  mediaQuery,
  mL,
  mR,
  pR,
  textBase,
  textLg,
  textSm,
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
import { chatHeaderStyle, chatHeaderToolbar } from './styles';
import exportIcon from '../../assets/icons/file-export.svg';
import ExportDialog from './ExportDialog';

const Topic = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  ${[textSm, fontNormal, mL(1)]};
  color: ${darken(0.2, textColor)};
`;

const toolbar = css`
  ${[flex, chatHeaderToolbar]};
  align-items: stretch;
`;

const ChannelName = styled.div`
  ${[textSm]};
  color: ${textColor};
  ${pR(1)};
  ${mR(1)};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: ${darken(0.2, textColor)};

  &::before {
    content: '#';
    ${fontMono};
    color: ${darken(0.2, textColor)};
    ${[pR(1)]};
  }
`;

const name = css`
  ${[textBase, fontBold, textLg]};
  color: ${textColor};
`;

const showOnMd = css`
  display: none;
  ${mediaQuery(breakpoint.md)} {
    display: unset;
  }
`;

function Header() {
  const pane = usePane();
  const channel = useSelector((state) => state.chatPane[pane]!.channel);
  const isPaneSplit = useSelector((state) => state.splitPane);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(channel.spaceId)?.member.isAdmin);
  const myMember = useSelector((state) => state.profile?.channels.get(channel.id)?.member);
  const [managePanel, setManagePanel] = useState(false);
  const [exportDialog, showExportDialog] = useState(false);
  const dispatch = useDispatch();
  const toggleSplit = useCallback(() => dispatch({ type: 'SPLIT_PANE', split: !isPaneSplit }), [isPaneSplit, dispatch]);
  useTitle(channel.name);
  return (
    <div css={chatHeaderStyle}>
      <ChannelName>
        <span css={name}>{channel.name}</span>
        <Topic>{channel.topic}</Topic>
      </ChannelName>
      <div css={toolbar}>
        <ChatHeaderButton css={[mL(1), showOnMd]} data-active={isPaneSplit} onClick={toggleSplit}>
          <Icon sprite={columns} />
        </ChatHeaderButton>
        {isSpaceAdmin && (
          <ChatHeaderButton css={[mL(1)]} onClick={() => setManagePanel(true)}>
            <Icon sprite={sliders} />
          </ChatHeaderButton>
        )}
        {(isSpaceAdmin || myMember?.isMaster) && (
          <ChatHeaderButton css={[mL(1)]} onClick={() => showExportDialog(true)}>
            <Icon sprite={exportIcon} />
          </ChatHeaderButton>
        )}
        <Filter css={[mL(1)]} />
        <MemberListButton channelId={channel.id} css={[mL(1)]} />
        <ChannelMemberButton css={mL(1)} />
      </div>
      {managePanel && <ManageChannel channel={channel} dismiss={() => setManagePanel(false)} />}
      {exportDialog && <ExportDialog channel={channel} dismiss={() => showExportDialog(false)} />}
    </div>
  );
}

export default Header;
