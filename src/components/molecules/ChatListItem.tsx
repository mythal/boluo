import * as React from 'react';
import ChatMessageItem from '@/components/molecules/ChatMessageItem';
import ChatPreviewItem from '@/components/molecules/ChatPreviewItem';
import ChatPreviewCompose from './ChatPreviewCompose';
import { ChatItem } from '@/states/chat-item-set';

interface Props {
  item: ChatItem;
}

function ChatListItem({ item }: Props) {
  if (item.type === 'MESSAGE') {
    return <ChatMessageItem message={item.message} />;
  } else if (item.type === 'PREVIEW') {
    if (item.mine) {
      return <ChatPreviewCompose preview={item.preview} />;
    } else if (item.preview) {
      return <ChatPreviewItem preview={item.preview} />;
    }
  }
  return null;
}

export default React.memo(ChatListItem);
