import React from 'react';
import { List, Map } from 'immutable';
import { Id } from '../../id';
import { ChatItem } from '../../states/chat';
import { ChatListItem } from './ChatListItem';
import { ChannelMember } from '../../api/channels';

interface Props {
  itemList: List<ChatItem>;
  colorMap: Map<Id, string>;
  member?: ChannelMember;
}

export const ChatList = React.memo<Props>(({ itemList, colorMap, member }) => {
  let prevItemDate = new Date();
  const chatList = itemList.map(item => {
    const chatListItem = (
      <ChatListItem key={item.id} item={item} colorMap={colorMap} prevItemTime={prevItemDate} member={member} />
    );
    prevItemDate = item.date;
    return chatListItem;
  });
  return <>{chatList}</>;
});
