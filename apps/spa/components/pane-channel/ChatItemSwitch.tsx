import { memo } from 'react';
import { ChatItem } from '../../state/channel.types';
import { ChatItemMessage } from './ChatItemMessage';
import { ChatItemPreview } from './ChatItemPreview';
import { ResolvedTheme } from '@boluo/theme';

interface Props {
  chatItem: ChatItem;
  myId: string | undefined;
  iAmAdmin: boolean;
  iAmMaster: boolean;
  isMember: boolean;
  className?: string;
  isLast: boolean;
  continuous: boolean;
  theme: ResolvedTheme;
}

export const ChatItemSwitch = memo<Props>(
  ({ chatItem, className = '', myId, continuous, iAmAdmin, iAmMaster, isMember, theme, isLast }) => {
    switch (chatItem.type) {
      case 'MESSAGE':
        return (
          <ChatItemMessage
            isLast={isLast}
            self={isMember && myId === chatItem.senderId}
            iAmAdmin={iAmAdmin}
            iAmMaster={iAmMaster}
            message={chatItem}
            className={className}
            continuous={continuous}
            theme={theme}
          />
        );
      case 'PREVIEW':
        return <ChatItemPreview isLast={isLast} preview={chatItem} className={className} theme={theme} />;
      default:
        return <div className={className}>Not implemented</div>;
    }
  },
);
ChatItemSwitch.displayName = 'ChatItemSwitch';