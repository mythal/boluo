import { memo } from 'react';
import { ChatItem } from '../../state/channel.types';
import { ChatItemMessage } from './ChatItemMessage';
import { ChatItemPreview } from './ChatItemPreview';

interface Props {
  chatItem: ChatItem;
  myId: string | undefined;
  iAmAdmin: boolean;
  iAmMaster: boolean;
  isMember: boolean;
  className?: string;
  continuous: boolean;
}

export const ChatItemSwitch = memo<Props>(
  ({ chatItem, className = '', myId, continuous, iAmAdmin, iAmMaster, isMember }) => {
    switch (chatItem.type) {
      case 'MESSAGE':
        return (
          <ChatItemMessage
            self={isMember && myId === chatItem.senderId}
            iAmAdmin={iAmAdmin}
            iAmMaster={iAmMaster}
            message={chatItem}
            className={className}
            continuous={continuous}
          />
        );
      case 'PREVIEW':
        return <ChatItemPreview preview={chatItem} className={className} />;
      default:
        return <div className={className}>Not implemented</div>;
    }
  },
);
ChatItemSwitch.displayName = 'ChatItemSwitch';
