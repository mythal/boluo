import * as React from 'react';
import { useState } from 'react';
import Columns from '@boluo/icons/legacy/Columns';
import FileExport from '@boluo/icons/legacy/FileExport';
import Lock from '@boluo/icons/legacy/Lock';
import Sliders from '@boluo/icons/legacy/Sliders';
import UserPlus from '@boluo/icons/legacy/UserPlus';
import X from '@boluo/icons/legacy/X';
import { useChannelId, usePane } from '../../hooks/useChannelId';
import { useTitle } from '../../hooks/useTitle';
import { useNotify } from '../../states/notify';
import { useSelector } from '../../store';
import Icon from '../atoms/Icon';
import ChannelMemberButton from './ChannelMemberButton';
import ChatHeaderButton from './ChatHeaderButton';
import ExportDialog from './ExportDialog';
import Filter from './Filter';
import InviteChannelMemberDialog from './InviteChannelMemberDialog';
import ManageChannel from './ManageChannel';
import { chatHeaderClassName } from './classNames';

const toolbarClassName = 'flex h-full [grid-area:toolbar] items-stretch';

interface Props {
  focus: () => void;
}

function Header({ focus }: Props) {
  const pane = useChannelId();
  const channel = useSelector((state) => state.chatStates.get(pane)!.channel);
  const isSpaceAdmin = useSelector(
    (state) => state.profile?.spaces.get(channel.spaceId)?.member.isAdmin,
  );
  const myMember = useSelector((state) => state.profile?.channels.get(channel.id)?.member);
  const [managePanel, setManagePanel] = useState(false);
  const [exportDialog, showExportDialog] = useState(false);
  const [inviteDialog, showInviteDialog] = useState(false);
  const { split, close } = usePane();
  useNotify();
  useTitle(channel.name);
  return (
    <div className={chatHeaderClassName} onClick={focus}>
      <div className="text-legacy-text-minor before:font-legacy-mono before:text-legacy-text-minor mr-1 overflow-hidden pr-1 text-[0.875rem] text-ellipsis whitespace-nowrap before:pr-1 before:content-['#']">
        {!channel.isPublic && <Icon icon={Lock} className="mr-1" />}
        <span className="text-legacy-text text-[1.125rem] font-bold">{channel.name}</span>
        <span className="text-legacy-text-minor ml-1 overflow-hidden text-[0.875rem] font-normal text-ellipsis whitespace-nowrap">
          {channel.topic}
        </span>
      </div>
      <div className={toolbarClassName}>
        {isSpaceAdmin && (
          <ChatHeaderButton
            aria-label="管理频道"
            className="legacy-chat-header-action"
            onClick={() => setManagePanel(true)}
          >
            <Icon icon={Sliders} />
          </ChatHeaderButton>
        )}
        {(isSpaceAdmin || myMember?.isMaster) && (
          <ChatHeaderButton
            aria-label="导出频道"
            className="legacy-chat-header-action"
            onClick={() => showExportDialog(true)}
          >
            <Icon icon={FileExport} />
          </ChatHeaderButton>
        )}

        <Filter className="legacy-chat-header-action" />
        {(isSpaceAdmin || myMember?.isMaster) && (
          <ChatHeaderButton
            aria-label="邀请频道成员"
            className="legacy-chat-header-action"
            onClick={() => showInviteDialog(true)}
          >
            <Icon icon={UserPlus} />
          </ChatHeaderButton>
        )}

        <ChatHeaderButton aria-label="分屏" className="legacy-chat-header-action" onClick={split}>
          <Icon icon={Columns} />
        </ChatHeaderButton>

        {close && (
          <ChatHeaderButton
            aria-label="关闭分屏"
            className="legacy-chat-header-action"
            onClick={close}
          >
            <Icon icon={X} />
          </ChatHeaderButton>
        )}

        <ChannelMemberButton className="legacy-chat-header-action" />
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
