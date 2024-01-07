import { DragOverlay } from '@dnd-kit/core';
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
    <DragOverlay zIndex={15}>
      {active && (
        <ChatItemMessage message={message} iAmMaster={iAmMaster} self={senderId === myId} className="px-4 py-2" />
      )}
    </DragOverlay>
  );
});
DraggingOverlay.displayName = 'DraggingOverlay';
