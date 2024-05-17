import { memo } from 'react';
import { ChatItem } from '../../state/channel.types';
import { ChatItemMessage } from './ChatItemMessage';
import { ChatItemPreview } from './ChatItemPreview';
import { ResolvedTheme } from '@boluo/theme';

interface Props {
  chatItem: ChatItem;
  className?: string;
  isLast: boolean;
  continuous: boolean;
}

export const ChatItemSwitch = memo<Props>(({ chatItem, className = '', continuous, isLast }) => {
  switch (chatItem.type) {
    case 'MESSAGE':
      return <ChatItemMessage isLast={isLast} message={chatItem} className={className} continuous={continuous} />;
    case 'PREVIEW':
      return <ChatItemPreview isLast={isLast} preview={chatItem} className={className} />;
    default:
      return <div className={className}>Not implemented</div>;
  }
});
ChatItemSwitch.displayName = 'ChatItemSwitch';
