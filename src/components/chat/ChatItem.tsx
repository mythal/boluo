import * as React from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useSelector } from '../../store';
import { EditItem, MessageItem, PreviewItem } from '../../states/chat-item-set';
import { ChannelMember } from '../../api/channels';
import { Draggable, DraggableProvided, DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import ChatPreviewCompose from './compose/EditCompose';
import ChatPreviewItem from './PreviewItem';
import ChatMessageItem from './MessageItem';
import MyPreview from './compose/MyPreview';

interface Props {
  item: PreviewItem | MessageItem;
  myMember?: ChannelMember | undefined;
  sameSender?: boolean;
  index: number;
}

const itemSwitch = (
  item: PreviewItem | MessageItem,
  editItem: EditItem | undefined,
  sameSender: boolean,
  myMember?: ChannelMember,
  handleProps?: DraggableProvidedDragHandleProps
) => {
  const myId = myMember?.userId;
  if (item.type === 'MESSAGE') {
    const { message } = item;
    if (editItem !== undefined && editItem.preview) {
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
    if (pane && item !== undefined && item.type === 'MESSAGE') {
      const editItem = state.chatStates.get(pane)!.itemSet.editions.get(item.message.id);
      if (
        editItem !== undefined &&
        (editItem.preview === undefined || editItem.preview.editFor === item.message.modified)
      ) {
        return editItem;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  });
  const draggable = myMember && item?.type === 'MESSAGE' && (item.mine || myMember.isMaster) && !editItem;
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
