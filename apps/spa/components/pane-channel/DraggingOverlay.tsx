import { DragOverlay } from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { memo } from 'react';
import type { DraggingItem } from './ChatContentView';
import { ChatItemMessage } from './ChatItemMessage';
import { DisableDelay } from '@boluo/ui/Delay';

interface Props {
  active: DraggingItem | null;
}

export const DraggingOverlay = memo<Props>(({ active }: Props) => {
  if (!active) {
    return null;
  }
  const { message } = active;
  return (
    <DragOverlay modifiers={[restrictToFirstScrollableAncestor]} zIndex={15}>
      <DisableDelay.Provider value={true}>
        {active && (
          <div className="@container">
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
