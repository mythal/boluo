import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { darken } from 'polished';
import * as React from 'react';
import { useState } from 'react';
import columnsIcon from '../../assets/icons/columns.svg';
import exportIcon from '../../assets/icons/file-export.svg';
import lockIcon from '../../assets/icons/lock.svg';
import sliders from '../../assets/icons/sliders.svg';
import userPlusIcon from '../../assets/icons/user-plus.svg';
import closeIcon from '../../assets/icons/x-circle.svg';
import { useChannelId, usePane } from '../../hooks/useChannelId';
import { useTitle } from '../../hooks/useTitle';
import { useNotify } from '../../states/notify';
import { useSelector } from '../../store';
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
import { textColor } from '../../styles/colors';
import Icon from '../atoms/Icon';
import ChannelMemberButton from './ChannelMemberButton';
import ChatHeaderButton from './ChatHeaderButton';
import ExportDialog from './ExportDialog';
import Filter from './Filter';
import InviteChannelMemberDialog from './InviteChannelMemberDialog';
import ManageChannel from './ManageChannel';
import { chatHeaderStyle, chatHeaderToolbar } from './styles';

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

interface Props {
  focus: () => void;
}

function Header({ focus }: Props) {
  const pane = useChannelId();
  const channel = useSelector((state) => state.chatStates.get(pane)!.channel);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(channel.spaceId)?.member.isAdmin);
  const myMember = useSelector((state) => state.profile?.channels.get(channel.id)?.member);
  const [managePanel, setManagePanel] = useState(false);
  const [exportDialog, showExportDialog] = useState(false);
  const [inviteDialog, showInviteDialog] = useState(false);
  const { split, close } = usePane();
  useNotify();
  useTitle(channel.name);
  return (
    <div css={chatHeaderStyle} onClick={focus}>
      <ChannelName>
        {!channel.isPublic && <Icon sprite={lockIcon} css={mR(1)} />}
        <span css={name}>{channel.name}</span>
        <Topic>{channel.topic}</Topic>
      </ChannelName>
      <div css={toolbar}>
        {/*<ChatHeaderButton css={[mL(1), showOnMd]} data-active={isPaneSplit} onClick={toggleSplit}>*/}
        {/*  <Icon sprite={columns} />*/}
        {/*</ChatHeaderButton>*/}
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
        {(isSpaceAdmin || myMember?.isMaster) && (
          <ChatHeaderButton css={[mL(1)]} onClick={() => showInviteDialog(true)}>
            <Icon sprite={userPlusIcon} />
          </ChatHeaderButton>
        )}

        <ChatHeaderButton css={[mL(1)]} onClick={split}>
          <Icon sprite={columnsIcon} />
        </ChatHeaderButton>

        {close && (
          <ChatHeaderButton css={[mL(1)]} onClick={close}>
            <Icon sprite={closeIcon} />
          </ChatHeaderButton>
        )}

        <ChannelMemberButton css={mL(1)} />
      </div>
      {managePanel && <ManageChannel channel={channel} dismiss={() => setManagePanel(false)} />}
      {exportDialog && <ExportDialog channel={channel} dismiss={() => showExportDialog(false)} />}
      {inviteDialog && (
        <InviteChannelMemberDialog
          channelId={channel.id}
          spaceId={channel.spaceId}
          dismiss={() => showInviteDialog(false)}
        />
      )}
    </div>
  );
}

export default React.memo(Header);
