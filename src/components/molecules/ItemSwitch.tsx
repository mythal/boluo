import * as React from 'react';
import { EditItem, MessageItem, PreviewItem } from '../../states/chat-item-set';
import { Id } from '../../utils/id';
import ChatPreviewCompose from './ChatPreviewCompose';
import ChatMessageItem from './ChatMessageItem';
import ChatPreviewItem from './ChatPreviewItem';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import { useSelector } from '../../store';

interface Props {
  item: PreviewItem | MessageItem | undefined;
  editItem?: EditItem;
  myId?: Id;
  handleProps?: DraggableProvidedDragHandleProps;
}

function ItemSwitch({ item, myId, editItem, handleProps }: Props) {
  const filter = useSelector((state) => state.chat!.filter);
  const inGame = filter === 'IN_GAME';
  const outGame = filter === 'OUT_GAME';

  if (item === undefined) {
    if (myId === undefined) {
      throw new Error(`unexpected item index.`);
    }
    return <ChatPreviewCompose preview={undefined} key={myId} />;
  } else if (item.type === 'MESSAGE') {
    const { message } = item;
    if ((inGame && !message.inGame) || (outGame && message.inGame)) {
      return null;
    }
    if (editItem !== undefined) {
      if (editItem.mine && myId) {
        if (editItem.preview === undefined || editItem.preview.editFor === message.modified) {
          return <ChatPreviewCompose preview={editItem.preview} editTo={message} />;
        }
      } else if (editItem.preview !== undefined && editItem.preview.editFor === message.modified) {
        return <ChatPreviewItem preview={editItem.preview} />;
      }
    }
    return <ChatMessageItem message={message} mine={item.mine} handleProps={handleProps} moving={item.moving} />;
  } else {
    // preview
    if (item.mine && myId) {
      return <ChatPreviewCompose key={item.id} preview={item.preview} />;
    } else if ((inGame && !item.preview.inGame) || (outGame && item.preview.inGame)) {
      return null;
    } else {
      return <ChatPreviewItem key={item.id} preview={item.preview} />;
    }
  }
}

export default React.memo(ItemSwitch);
