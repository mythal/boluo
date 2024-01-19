import { DragOverlay } from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { memo } from 'react';
import { DraggingItem } from './ChatContentView';
import { ChatItemMessage } from './ChatItemMessage';

interface Props {
  active: DraggingItem | null;
  iAmMaster: boolean;
  myId: string | null | undefined;
}

export const DraggingOverlay = memo<Props>(({ active, myId, iAmMaster }) => {
  if (!active) {
    return null;
  }
  const { message } = active;
  const { senderId } = message;
  return (
    <DragOverlay modifiers={[restrictToFirstScrollableAncestor]} zIndex={15}>
      {active && (
        <div className="@container">
          <ChatItemMessage
            overlay={true}
            message={message}
            iAmMaster={iAmMaster}
            iAmAdmin={false}
            self={senderId === myId}
            className="px-4 py-2"
          />
        </div>
      )}
    </DragOverlay>
  );
});
DraggingOverlay.displayName = 'DraggingOverlay';
