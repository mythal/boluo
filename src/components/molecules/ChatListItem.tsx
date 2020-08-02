import * as React from 'react';
import { ChatItem } from '@/reducers/chat';
import ChatMessageItem from '@/components/molecules/ChatMessageItem';
import ChatPreviewItem from '@/components/molecules/ChatPreviewItem';
import ChatMyPreview from '@/components/molecules/ChatMyPreview';

interface Props {
  item: ChatItem;
}

function ChatListItem({ item }: Props) {
  if (item.type === 'MESSAGE') {
    return <ChatMessageItem message={item.message} />;
  } else if (item.type === 'PREVIEW') {
    return <ChatPreviewItem preview={item.preview} />;
  } else if (item.type === 'MY_PREVIEW') {
    return <ChatMyPreview preview={item.preview} />;
  }
  return null;
}

export default React.memo(ChatListItem);
