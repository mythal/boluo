import React, { MouseEventHandler, useState } from 'react';
import { DeleteIcon, ExpandIcon, FoldIcon, InsertIcon } from '../icons';
import { post } from '../../api/request';
import { ChannelMember } from '../../api/channels';
import { SpaceMember } from '../../api/spaces';
import { ConfirmDialog } from '../ConfirmDialog';

interface Props {
  id: string;
  folded: boolean;
  inGame: boolean;
  channelMember: ChannelMember;
  spaceMember: SpaceMember;
  text: string;
}

export const MessageMenu = React.memo<Props>(({ folded, id, channelMember, spaceMember, text }) => {
  const [openDeleteDialog, setDeleteConfirm] = useState(false);

  const toggleFold: MouseEventHandler = async e => {
    e.stopPropagation();
    await post('/messages/toggle_fold', {}, { id });
  };

  const dismissDeleteDialog = () => setDeleteConfirm(false);
  const deleteMessage: MouseEventHandler = async e => {
    e.stopPropagation();
    await post('/messages/delete', {}, { id });
    dismissDeleteDialog();
  };

  const iAmMaster = channelMember.isMaster;
  const isMine = channelMember.userId === id;
  const iAmAdmin = spaceMember.isAdmin;

  return (
    <>
      <button title="折叠" hidden={!iAmMaster && !isMine} className="message-operation" onClick={toggleFold}>
        {folded ? <ExpandIcon /> : <FoldIcon />}
      </button>
      <ConfirmDialog open={openDeleteDialog} confirmText="删除" dismiss={dismissDeleteDialog} submit={deleteMessage}>
        <div className="font-bold text-sm">想要删除这条消息吗？</div>
        <div className="text-xs my-1 max-w-sm">
          删除用于清理垃圾消息，主持人也可以使用「折叠」（
          <FoldIcon />
          ）功能将消息隐藏掉。
        </div>
        <div className="font-mono whitespace-pre max-w-sm truncate border-teal-400 border-l-4 pl-2 my-4">{text}</div>
      </ConfirmDialog>
      <button title="删除" hidden={!iAmAdmin} className="message-operation" onClick={() => setDeleteConfirm(true)}>
        <DeleteIcon />
      </button>
      {/*<button className="message-operation"><InsertIcon/></button>*/}
    </>
  );
});
