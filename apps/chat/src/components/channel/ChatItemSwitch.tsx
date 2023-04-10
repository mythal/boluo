import type { FC } from 'react';
import { ChatItem } from '../../types/chat-items';
import { ChatItemMessage } from './ChatItemMessage';
import { ChatItemPreview } from './ChatItemPreview';

interface Props {
  chatItem: ChatItem;
  myId: string | undefined;
  className?: string;
  isContinuous: boolean;
}

export const ChatItemSwitch: FC<Props> = ({ chatItem, className = '', myId, isContinuous }) => {
  switch (chatItem.type) {
    case 'MESSAGE':
      return (
        <ChatItemMessage
          self={myId === chatItem.senderId}
          message={chatItem}
          className={className}
          isContinuous={isContinuous}
        />
      );
    case 'PREVIEW':
      return <ChatItemPreview self={myId === chatItem.senderId} preview={chatItem} className={className} />;
    default:
      return <div className={className}>Not implemented</div>;
  }
};
