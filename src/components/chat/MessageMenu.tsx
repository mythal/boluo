import React, { MouseEventHandler, useRef, useState } from 'react';
import { EllipsisIcon, FoldIcon } from '../icons';
import { post } from '../../api/request';
import { ChannelMember } from '../../api/channels';
import { SpaceMember } from '../../api/spaces';
import { ConfirmDialog } from '../ConfirmDialog';
import { cls } from '../../classname';
import { Menu } from '../Menu';

interface Props {
  id: string;
  folded: boolean;
  inGame: boolean;
  channelMember: ChannelMember;
  spaceMember: SpaceMember;
  text: string;
}

export const MessageMenu = React.memo<Props>(({ folded, id, channelMember, spaceMember, text }) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const openMenu: MouseEventHandler = e => {
    e.stopPropagation();
    setOpen(true);
  };
  const closeMenu = () => setOpen(false);

  const toggleFold = async () => {
    await post('/messages/toggle_fold', {}, { id });
  };

  const openDeleteDialog = () => {
    setDeleteDialog(true);
  };
  const dismissDeleteDialog = () => setDeleteDialog(false);
  const deleteMessage = async () => {
    await post('/messages/delete', {}, { id });
    dismissDeleteDialog();
  };

  const iAmMaster = channelMember.isMaster;
  const isMine = channelMember.userId === id;
  const iAmAdmin = spaceMember.isAdmin;

  return (
    <>
      <button
        className={cls('sidebar-btn text-black mt-1', { 'sidebar-btn-down': open })}
        onClick={openMenu}
        ref={buttonRef}
      >
        <EllipsisIcon />
      </button>
      <Menu dismiss={closeMenu} open={open} anchor={buttonRef} l>
        <li className="menu-item" hidden={!iAmAdmin} onClick={openDeleteDialog}>
          删除
        </li>
        <li className="menu-item" hidden={!iAmMaster && !isMine} onClick={toggleFold}>
          {folded ? <span>展开</span> : <span>折叠</span>}
        </li>
      </Menu>
      <ConfirmDialog open={deleteDialog} confirmText="删除" dismiss={dismissDeleteDialog} submit={deleteMessage}>
        <div className="font-bold text-sm">想要删除这条消息吗？</div>
        <div className="text-xs my-1 max-w-sm">
          删除用于清理垃圾消息，主持人也可以使用「折叠」（
          <FoldIcon />
          ）功能将消息隐藏掉。
        </div>
        <div className="font-mono whitespace-pre max-w-sm truncate border-teal-400 border-l-4 pl-2 my-4">{text}</div>
      </ConfirmDialog>
    </>
  );
});
