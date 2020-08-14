import * as React from 'react';
import { css } from '@emotion/core';
import { useSelector } from '@/store';
import { pY } from '@/styles/atoms';
import LoadMoreButton from '@/components/molecules/LoadMoreButton';
import styled from '@emotion/styled';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { ChatItem, ChatItemSet, MessageItem, PreviewItem } from '@/states/chat-item-set';
import ChatPreviewCompose from '../molecules/ChatPreviewCompose';
import { ChatState } from '@/reducers/chat';
import ChatPreviewItem from '@/components/molecules/ChatPreviewItem';
import ChatMessageItem from '@/components/molecules/ChatMessageItem';
import Loading from '@/components/molecules/Loading';
import { bgColor } from '@/styles/colors';

const useAutoScroll = (chatListRef: React.RefObject<HTMLDivElement>): (() => void) => {
  const scrollEnd = useRef<number>(0);

  useEffect(() => {
    if (!chatListRef.current) {
      return;
    }
    const chatList = chatListRef.current;
    const lockSpan = chatList.clientHeight >> 1;
    if (chatList.scrollTop < lockSpan || scrollEnd.current < lockSpan) {
      chatList.scrollTo(0, chatList.scrollHeight - chatList.clientHeight - scrollEnd.current);
    }
  });

  return useCallback(() => {
    if (chatListRef.current === null) {
      return;
    }
    const chatList = chatListRef.current;
    scrollEnd.current = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight;
  }, [chatListRef]);
};

const container = css`
  grid-area: list;
  background-color: ${bgColor};
  overflow-x: hidden;
  overflow-y: scroll;
`;

const LoadMoreContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  ${pY(6)};
`;

const ItemLayout = styled.div``;

const itemFilter = (type: ChatState['filter']) => (item: ChatItem): boolean => {
  if (type === 'NONE') {
    return true;
  }
  const inGame = type === 'IN_GAME';
  if (item.type === 'MESSAGE') {
    return inGame === item.message.inGame;
  } else if (item.type === 'PREVIEW' && item.preview) {
    return inGame === item.preview.inGame;
  } else if (item.type === 'EDIT') {
    if (item.preview) {
      return inGame === item.preview.inGame;
    }
  }
  return true;
};

export const itemCompare = (a: ChatItem, b: ChatItem) => {
  return a.date - b.date;
};

const makePreview = (item: PreviewItem) => {
  if (item.mine) {
    return <ChatPreviewCompose key={item.id} preview={item.preview} />;
  } else {
    return <ChatPreviewItem key={item.id} preview={item.preview} />;
  }
};

const makeMessage = (item: MessageItem) => {
  return <ChatMessageItem key={item.id} message={item.message} mine={item.mine} />;
};

const genItemList = (itemSet: ChatItemSet, filterType: ChatState['filter']): React.ReactNodeArray => {
  const itemList: React.ReactNodeArray = [];
  const previews = [...itemSet.previews.values()].sort(itemCompare);
  const filter = itemFilter(filterType);

  for (const messageItem of itemSet.messages) {
    const { message } = messageItem;
    while (previews.length > 0 && previews[previews.length - 1].date < messageItem.date) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const previewItem = previews.pop()!;
      if (filter(previewItem)) {
        itemList.push(makePreview(previewItem));
      }
    }
    if (!filter(messageItem)) {
      continue;
    }
    const editItem = itemSet.editions.get(messageItem.id);
    if (editItem) {
      if (editItem.mine) {
        itemList.push(<ChatPreviewCompose key={editItem.id} preview={editItem.preview} editTo={message} />);
      } else if (
        editItem.preview &&
        message.modified === editItem.preview.editFor && // correct edit target
        editItem.preview.senderId === message.senderId // same user
      ) {
        itemList.push(<ChatPreviewItem key={editItem.id} preview={editItem.preview} />);
      } else {
        itemList.push(makeMessage(messageItem));
      }
    } else {
      itemList.push(makeMessage(messageItem));
    }
  }

  for (const previewItem of previews) {
    if (filter(previewItem)) {
      itemList.push(makePreview(previewItem));
    }
  }
  return itemList;
};

const ChatListContext = React.createContext<React.RefObject<HTMLDivElement | null>>(React.createRef());

export function useChatList(): React.RefObject<HTMLDivElement | null> {
  return useContext(ChatListContext);
}

function ChatList() {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const initialized = useSelector((state) => state.chat!.initialized);
  const filterType = useSelector((state) => state.chat!.filter);
  const itemSet = useSelector((state) => state.chat!.itemSet);
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  const chatListRef = useRef(null);
  const onScroll = useAutoScroll(chatListRef);

  // If shouldn't display dummy preview, `myId` is undefended.
  const myId = useSelector((state) => {
    if (!state.profile || !state.chat) {
      return false;
    }
    const myId = state.profile.user.id;
    const member = state.profile.channels.get(state.chat.channel.id);
    const preview = state.chat.itemSet.previews.get(myId);
    return member && !preview ? myId : undefined;
  });

  if (!initialized) {
    return <Loading />;
  }

  const itemList = genItemList(itemSet, filterType);
  return (
    <div css={container} ref={chatListRef} onScroll={onScroll}>
      <ChatListContext.Provider value={chatListRef}>
        <LoadMoreContainer>
          <LoadMoreButton />
        </LoadMoreContainer>
        <ItemLayout>
          {itemList}
          {myId && <ChatPreviewCompose key={myId} preview={undefined} />}
        </ItemLayout>
      </ChatListContext.Provider>
    </div>
  );
}

export default ChatList;
