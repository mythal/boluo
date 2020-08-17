import * as React from 'react';
import { useEffect } from 'react';
import ChatMessageItem from '@/components/molecules/ChatMessageItem';
import ChatPreviewItem from '@/components/molecules/ChatPreviewItem';
import ChatPreviewCompose from './ChatPreviewCompose';
import { ChatItem } from '@/states/chat-item-set';
import { useSelector } from '@/store';
import { ChatState } from '@/reducers/chat';

interface Props {
  itemIndex: number;
  measure: () => void;
}

const itemFilter = (type: ChatState['filter']) => (item: ChatItem): boolean => {
  if (type === 'NONE') {
    return true;
  }
  const inGame = type === 'IN_GAME';
  if (item.type === 'MESSAGE') {
    return inGame === item.message.inGame;
  } else if (item.type === 'PREVIEW' && item.preview && !item.mine) {
    return inGame === item.preview.inGame;
  } else if (item.type === 'EDIT') {
    if (item.preview) {
      return inGame === item.preview.inGame;
    }
  }
  return true;
};

function Items({ itemIndex, measure }: Props) {
  const item = useSelector((state) => state.chat!.itemSet.messages.get(itemIndex));
  const myId = useSelector((state) => {
    if (state.profile === undefined || state.chat === undefined || itemIndex !== state.chat.itemSet.messages.size) {
      return undefined;
    } else {
      return state.profile.user.id;
    }
  });
  const editItem = useSelector((state) => {
    if (item !== undefined && item.type === 'MESSAGE') {
      return state.chat!.itemSet.editions.get(item.message.id);
    } else {
      return undefined;
    }
  });
  const filterTag = useSelector((state) => state.chat!.filter);
  const filter = itemFilter(filterTag);

  useEffect(() => {
    measure();
  });

  if (item === undefined) {
    if (myId === undefined) {
      throw new Error(`unexpected item index.`);
    }
    return <ChatPreviewCompose preview={undefined} key={myId} />;
  } else if (item.type === 'MESSAGE') {
    const { message } = item;
    if (editItem !== undefined && editItem.preview === undefined && editItem.mine) {
      // start editing
      return <ChatPreviewCompose preview={editItem.preview} editTo={message} />;
    } else if (
      // normal message
      editItem === undefined ||
      editItem.preview === undefined ||
      editItem.preview.editFor !== message.modified
    ) {
      if (filter(item)) {
        return <ChatMessageItem message={message} mine={item.mine} />;
      }
    } else if (editItem.mine && filter(editItem)) {
      return <ChatPreviewCompose preview={editItem.preview} editTo={message} />;
    } else if (filter(editItem)) {
      return <ChatPreviewItem preview={editItem.preview} />;
    }
  } else if (item.type === 'PREVIEW') {
    if (item.mine) {
      return <ChatPreviewCompose key={item.id} preview={item.preview} />;
    } else {
      return <ChatPreviewItem key={item.id} preview={item.preview} />;
    }
  }
  return null;
}

export const ChatListItems = React.memo(Items);
