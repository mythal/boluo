import { DragOverlay } from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { memo, use } from 'react';
import type { DraggingItem } from './ChatContentView';
import { ChatItemMessage } from './ChatItemMessage';
import { DisableDelay } from '@boluo/ui/Delay';
import { ChannelLayoutContext } from '../../hooks/useChannelLayout';
import { MessageSizeContext } from '../../hooks/useMessageSize';

interface Props {
  active: DraggingItem | null;
}

export const DraggingOverlay = memo<Props>(({ active }: Props) => {
  if (!active) {
    return null;
  }
  const { message } = active;
  const layout = use(ChannelLayoutContext);
  const messageSize = use(MessageSizeContext);
  return (
    <DragOverlay modifiers={[restrictToFirstScrollableAncestor]} zIndex={15}>
      <DisableDelay.Provider value={true}>
        {active && (
          <div className={`@container ${layout} ${messageSize}`}>
            <ChatItemMessage
              overlay={true}
              message={message}
              isLast={false}
              className="px-4 py-2"
            />
          </div>
        )}
      </DisableDelay.Provider>
    </DragOverlay>
  );
});
DraggingOverlay.displayName = 'DraggingOverlay';
