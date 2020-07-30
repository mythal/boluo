import * as React from 'react';
import { css } from '@emotion/core';
import ChatListItem from '../molecules/ChatListItem';
import { useSelector } from '@/store';

const container = css`
  grid-area: list;
  background-color: darkslateblue;
`;

function ChatList() {
  const itemList = useSelector((state) => state.ui.chat!.itemList);
  return (
    <div css={container}>
      {itemList.map((item) => (
        <ChatListItem key={item.id} item={item} />
      ))}
    </div>
  );
}

export default ChatList;
