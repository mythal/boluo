import * as React from 'react';
import { useEffect, useRef } from 'react';
import ChatMessageItem from '../../components/molecules/ChatMessageItem';
import ChatPreviewItem from '../../components/molecules/ChatPreviewItem';
import ChatPreviewCompose from './ChatPreviewCompose';
import { ChatItem } from '../../states/chat-item-set';
import { useSelector } from '../../store';
import { ChatState } from '../../reducers/chat';
import LoadMoreButton, { LoadMoreContainer } from './LoadMoreButton';

interface Props {
  itemIndex: number;
  measure?: (rect: DOMRect) => void;
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
    if (state.profile === undefined || state.chat === undefined) {
      return undefined;
    } else {
      return state.profile.channels.get(state.chat!.channel.id)?.member.userId;
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
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current && measure) {
      measure(containerRef.current.getBoundingClientRect());
    }
  });
  const filter = itemFilter(filterTag);

  let itemNode: React.ReactNode = null;
  if (item === undefined) {
    if (myId === undefined) {
      throw new Error(`unexpected item index.`);
    }
    itemNode = <ChatPreviewCompose preview={undefined} key={myId} />;
  } else if (item.type === 'MESSAGE') {
    const { message } = item;
    if (editItem !== undefined && editItem.preview === undefined && editItem.mine && myId) {
      // start editing
      itemNode = <ChatPreviewCompose preview={editItem.preview} editTo={message} />;
    } else if (
      // normal message
      editItem === undefined ||
      editItem.preview === undefined ||
      editItem.preview.editFor !== message.modified
    ) {
      if (filter(item)) {
        itemNode = <ChatMessageItem message={message} mine={item.mine} />;
      }
    } else if (editItem.mine && filter(editItem) && myId) {
      itemNode = <ChatPreviewCompose preview={editItem.preview} editTo={message} />;
    } else if (filter(editItem)) {
      itemNode = <ChatPreviewItem preview={editItem.preview} />;
    }
  } else if (item.type === 'PREVIEW') {
    if (item.mine && myId) {
      itemNode = <ChatPreviewCompose key={item.id} preview={item.preview} />;
    } else {
      itemNode = <ChatPreviewItem key={item.id} preview={item.preview} />;
    }
  }
  return (
    <div ref={containerRef}>
      {itemIndex === 0 && (
        <LoadMoreContainer>
          <LoadMoreButton />
        </LoadMoreContainer>
      )}
      {itemNode}
    </div>
  );
}

export const ChatListItems = React.memo(Items);
