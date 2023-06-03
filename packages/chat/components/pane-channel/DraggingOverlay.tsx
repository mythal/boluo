import { DragOverlay } from '@dnd-kit/core';
import { memo } from 'react';
import { DraggingItem } from './ChatContentView';
import { ChatItemMessage } from './ChatItemMessage';

interface Props {
  active: DraggingItem | null;
  myId: string | null | undefined;
}

export const DraggingOverlay = memo<Props>(({ active, myId }) => {
  if (!active) {
    return null;
  }
  const { message } = active;
  const { senderId } = message;
  return (
    <DragOverlay zIndex={15}>
      {active && <ChatItemMessage message={message} self={senderId === myId} className="py-2 px-4" />}
    </DragOverlay>
  );
});
DraggingOverlay.displayName = 'DraggingOverlay';
