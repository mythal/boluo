import type { FC } from 'react';
import { ChatItem } from '../../../types/chat-items';
import { ChatItemMessage } from './ChatItemMessage';
import { ChatItemPreview } from './ChatItemPreview';

interface Props {
  chatItem: ChatItem;
  className?: string;
}

export const ChatItemSwitch: FC<Props> = ({ chatItem, className = '' }) => {
  switch (chatItem.type) {
    case 'MESSAGE':
      return <ChatItemMessage message={chatItem} className={className} />;
    case 'PREVIEW':
      return <ChatItemPreview preview={chatItem} className={className} />;
    default:
      return <div className={className}>Not implemented</div>;
  }
};
