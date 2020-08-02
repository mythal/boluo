import * as React from 'react';
import { css } from '@emotion/core';
import ChatListItem from '../molecules/ChatListItem';
import { useSelector } from '@/store';
import { bgColor, pY } from '@/styles/atoms';
import LoadMoreButton from '@/components/molecules/LoadMoreButton';
import styled from '@emotion/styled';
import { ChatItem, newMyPreviewItem } from '@/reducers/chat';

const container = css`
  grid-area: list;
  background-color: ${bgColor};
  overflow-x: hidden;
  overflow-y: scroll;
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }
`;

const LoadMoreContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  ${pY(2)};
`;

const ItemLayout = styled.div``;

const isInGame = (item: ChatItem) => {
  if (item.type === 'MESSAGE') {
    return item.message.inGame;
  } else if (item.type === 'PREVIEW') {
    return item.preview.inGame;
  } else if (item.type === 'MY_PREVIEW') {
    return true;
  }
  return false;
};

const isOutGame = (item: ChatItem) => {
  if (item.type === 'MESSAGE') {
    return !item.message.inGame;
  } else if (item.type === 'PREVIEW') {
    return !item.preview.inGame;
  } else if (item.type === 'MY_PREVIEW') {
    return true;
  }
  return false;
};

function ChatList() {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const initialized = useSelector((state) => state.chat!.initialized);
  const filter = useSelector((state) => state.chat!.filter);
  let itemList = useSelector((state) => state.chat!.itemList)
    .toSeq()
    .reverse();
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  const myId = useSelector((state) => {
    if (!state.profile || !state.chat) {
      return false;
    }
    const myId = state.profile.user.id;
    const member = state.profile.channels.get(state.chat.channel.id);
    const entry = state.chat.itemMap.get(myId);
    return member && !entry ? myId : undefined;
  });

  if (filter === 'IN_GAME') {
    itemList = itemList.filter(isInGame);
  } else if (filter === 'OUT_GAME') {
    itemList = itemList.filter(isOutGame);
  }
  if (myId && initialized) {
    itemList = itemList.concat(newMyPreviewItem(myId));
  }

  return (
    <div css={container}>
      {initialized && (
        <LoadMoreContainer>
          <LoadMoreButton />
        </LoadMoreContainer>
      )}
      <ItemLayout>
        {itemList.map((item) => (
          <ChatListItem key={item.id} item={item} />
        ))}
      </ItemLayout>
    </div>
  );
}

export default ChatList;
