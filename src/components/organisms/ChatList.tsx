import * as React from 'react';
import { css } from '@emotion/core';
import { ChatItem } from '../../reducers/chat';
import ChatListItem from '../molecules/ChatListItem';
import { List } from 'immutable';

interface Props {
  itemList: List<ChatItem>;
}

const container = css`
  grid-area: list;
  background-color: darkslateblue;
`;

function ChatList({ itemList }: Props) {
  return (
    <div css={container}>
      {itemList.map((item) => (
        <ChatListItem key={item.id} item={item} />
      ))}
    </div>
  );
}

export default ChatList;
