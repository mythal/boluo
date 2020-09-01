import * as React from 'react';
import ChatPreviewCompose from './compose/EditCompose';
import ChatMessageItem from './MessageItem';
import ChatPreviewItem from './PreviewItem';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import { useSelector } from '../../store';
import { ChannelMember } from '../../api/channels';
import { EditItem, MessageItem, PreviewItem } from '../../states/chat-item-set';
import { usePane } from '../../hooks/usePane';

interface Props {
  item: MessageItem | PreviewItem;
  editItem?: EditItem;
  myMember?: ChannelMember;
  handleProps?: DraggableProvidedDragHandleProps;
  measure: () => void;
}

function ItemSwitch({ item, myMember, editItem, handleProps, measure }: Props) {
  const myId = myMember?.userId;
  const pane = usePane();
  const filter = useSelector((state) => state.chatPane[pane]!.filter);
  const inGame = filter === 'IN_GAME';
  const outGame = filter === 'OUT_GAME';

  if (item.type === 'MESSAGE') {
    const { message } = item;
    if ((inGame && !message.inGame) || (outGame && message.inGame)) {
      return null;
    }
    if (editItem !== undefined) {
      if (editItem.mine && myId) {
        return <ChatPreviewCompose preview={editItem.preview} editTo={message} measure={measure} />;
      } else if (editItem.preview !== undefined) {
        return <ChatPreviewItem preview={editItem.preview} measure={measure} />;
      }
    }
    return (
      <ChatMessageItem
        message={message}
        mine={item.mine}
        myMember={myMember}
        handleProps={handleProps}
        moving={item.moving}
        measure={measure}
      />
    );
  } else {
    // preview
    if ((inGame && !item.preview.inGame) || (outGame && item.preview.inGame)) {
      return null;
    } else {
      return <ChatPreviewItem key={item.id} preview={item.preview} measure={measure} />;
    }
  }
}

export default React.memo(ItemSwitch);
