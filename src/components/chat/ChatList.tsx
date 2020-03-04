import React from 'react';
import { List, Map } from 'immutable';
import { Id } from '../../id';
import { ChatItem } from '../../states/chat';
import { ChatListItem } from './ChatListItem';

interface Props {
  itemList: List<ChatItem>;
  colorMap: Map<Id, string>;
}

export const ChatList = React.memo<Props>(({ itemList, colorMap }) => {
  let prevItemDate = new Date();
  const chatList = itemList.map(item => {
    const chatListItem = <ChatListItem key={item.id} item={item} colorMap={colorMap} prevItemTime={prevItemDate} />;
    prevItemDate = item.date;
    return chatListItem;
  });
  return <>{chatList}</>;
});
