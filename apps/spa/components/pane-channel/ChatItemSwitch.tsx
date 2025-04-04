import { memo } from 'react';
import { type ChatItem } from '../../state/channel.types';
import { ChatItemMessage } from './ChatItemMessage';
import { ChatItemPreview } from './ChatItemPreview';
import { IsOptimisticContext } from '../../hooks/useIsOptimistic';

interface Props {
  chatItem: ChatItem;
  className?: string;
  isLast: boolean;
  continuous: boolean;
}

export const ChatItemSwitch = memo<Props>(
  ({ chatItem, className = '', continuous, isLast }: Props) => {
    switch (chatItem.type) {
      case 'MESSAGE':
        return (
          <IsOptimisticContext value={chatItem.optimistic || false}>
            <ChatItemMessage
              isLast={isLast}
              message={chatItem}
              className={className}
              continuous={continuous}
            />
          </IsOptimisticContext>
        );
      case 'PREVIEW':
        return (
          <IsOptimisticContext value={chatItem.optimistic || false}>
            <ChatItemPreview isLast={isLast} preview={chatItem} className={className} />
          </IsOptimisticContext>
        );
      default:
        return <div className={className}>Not implemented</div>;
    }
  },
);
ChatItemSwitch.displayName = 'ChatItemSwitch';
