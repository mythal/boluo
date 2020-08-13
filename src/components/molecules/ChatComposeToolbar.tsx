import * as React from 'react';
import ChatItemToolbarButton from '@/components/atoms/ChatItemToolbarButton';
import { mR } from '@/styles/atoms';
import mask from '@/assets/icons/theater-masks.svg';
import running from '@/assets/icons/running.svg';
import broadcastTower from '@/assets/icons/broadcast-tower.svg';
import cancelIcon from '@/assets/icons/cancel.svg';
import editIcon from '@/assets/icons/edit.svg';
import paperPlane from '@/assets/icons/paper-plane.svg';
import ChatItemToolbar from '@/components/molecules/ChatItemToolbar';
import { patch } from '@/api/request';
import { Id } from '@/utils/id';
import { useCallback } from 'react';

interface Props {
  inGame: boolean;
  toggleInGame: () => void;
  isAction: boolean;
  toggleAction: () => void;
  broadcast: boolean;
  toggleBroadcast: () => void;
  toolbarPosition: 'top' | 'bottom';
  editId?: Id;
  send: () => void;
}

function ChatComposeToolbar({
  editId,
  toolbarPosition,
  inGame,
  toggleInGame,
  isAction,
  toggleAction,
  broadcast,
  toggleBroadcast,
  send,
}: Props) {
  const cancelEdit = useCallback(() => {
    if (editId !== undefined) {
      const messageId = editId;
      patch('/messages/edit', { messageId }).then();
    }
  }, [editId]);
  return (
    <ChatItemToolbar position={toolbarPosition}>
      <ChatItemToolbarButton css={mR(1)} on={inGame} onClick={toggleInGame} sprite={mask} title="游戏内" />

      <ChatItemToolbarButton css={mR(1)} on={isAction} onClick={toggleAction} sprite={running} title="描述动作" />

      <ChatItemToolbarButton
        css={mR(4)}
        sprite={broadcastTower}
        on={broadcast}
        onClick={toggleBroadcast}
        title="输入中广播"
      />

      {editId && <ChatItemToolbarButton css={mR(1)} sprite={cancelIcon} onClick={cancelEdit} title="取消" />}
      <ChatItemToolbarButton
        sprite={editId ? editIcon : paperPlane}
        onClick={send}
        title={editId ? '提交修改' : '发送'}
      />
    </ChatItemToolbar>
  );
}

export default ChatComposeToolbar;
