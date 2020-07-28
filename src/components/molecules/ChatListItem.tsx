import * as React from 'react';
import { ChatItem } from '../../reducers/chat';

interface Props {
  item: ChatItem;
}

function ChatListItem({ item }: Props) {
  if (item.type === 'MESSAGE') {
    return <div>{item.message.text}</div>;
  }
  return <div />;
}

export default ChatListItem;
