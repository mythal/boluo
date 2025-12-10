import * as React from 'react';
import {
  Draggable,
  type DraggableProvided,
  type DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd';
import { type ChannelMember } from '../../api/channels';
import { useChannelId } from '../../hooks/useChannelId';
import { type MessageItem, type PreviewItem } from '../../states/chat-item-set';
import { useSelector } from '../../store';
import MyPreview from './compose/MyPreview';
import ChatMessageItem from './MessageItem';
import ChatPreviewItem from './PreviewItem';

interface Props {
  item: PreviewItem | MessageItem;
  myMember?: ChannelMember | undefined;
  sameSender?: boolean;
  index: number;
}

const itemSwitch = (
  item: PreviewItem | MessageItem,
  editItem: PreviewItem | undefined,
  sameSender: boolean,
  myMember?: ChannelMember,
  handleProps?: DraggableProvidedDragHandleProps | null,
) => {
  const myId = myMember?.userId;
  if (item.type === 'MESSAGE') {
    const { message } = item;
    if (editItem !== undefined) {
      if (myId && editItem.preview.senderId === myId) {
        return <MyPreview key={item.id} preview={editItem.preview} />;
      }
      return <ChatPreviewItem preview={editItem.preview} />;
    }
    return (
      <ChatMessageItem
        message={message}
        mine={item.mine}
        myMember={myMember}
        handleProps={handleProps}
        moving={item.moving}
        sameSender={sameSender}
      />
    );
  } else if (myMember && item.preview.senderId === myMember.userId) {
    return <MyPreview key={item.id} preview={item.preview} />;
  } else {
    return <ChatPreviewItem key={item.id} preview={item.preview} />;
  }
};
function ChatItem({ item, myMember, index, sameSender = false }: Props) {
  const pane = useChannelId();

  const editItem = useSelector((state) => {
    if (item === undefined || item.type !== 'MESSAGE') {
      return;
    }
    const previewItem = state.chatStates.get(pane)?.itemSet.previews.get(item.message.senderId);
    if (!previewItem) {
      return;
    }
    const preview = previewItem.preview;
    if (preview.id !== item.message.id || preview.edit?.time !== item.message.modified) {
      return;
    }
    return previewItem;
  });
  const draggable =
    myMember && item?.type === 'MESSAGE' && (item.mine || myMember.isMaster) && !editItem;
  const id = item?.id || myMember?.userId || 'UNEXPECTED';
  const renderer = (provided: DraggableProvided) => {
    return (
      <div>
        <div ref={provided.innerRef} {...provided.draggableProps}>
          {itemSwitch(item, editItem, sameSender, myMember, provided.dragHandleProps)}
        </div>
      </div>
    );
  };
  return (
    <Draggable draggableId={id} index={index} isDragDisabled={!draggable}>
      {renderer}
    </Draggable>
  );
}

export default React.memo(ChatItem);
