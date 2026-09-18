import { useCallback, useEffect, useRef, useState } from 'react';
import type { List } from 'immutable';
import type { DragDropContextProps } from '@hello-pangea/dnd';
import { showFlash } from '../../actions';
import { post } from '../../api/request';
import type { ChatItem } from '../../states/chat-item-set';
import store, { useDispatch } from '../../store';
import { throwErr } from '../../utils/errors';
import type { Id } from '../../utils/id';
import { prepareMessageMove } from './message-move';

export function useMessageDrag(channelId: Id, filteredMessages: List<ChatItem>) {
  const dispatch = useDispatch();
  const [snapshot, setSnapshot] = useState<typeof filteredMessages | null>(null);
  const snapshotRef = useRef<typeof filteredMessages | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<Id>>(new Set());
  const pendingIdsRef = useRef(new Set<Id>());

  // onBeforeCapture runs synchronously before the drag library measures the list.
  const onBeforeCapture = useCallback(() => {
    snapshotRef.current = filteredMessages;
    setSnapshot(filteredMessages);
    dispatch({ type: 'START_MOVE_MESSAGE', pane: channelId });
  }, [channelId, dispatch, filteredMessages]);

  useEffect(
    () => () => {
      snapshotRef.current = null;
      dispatch({ type: 'FINISH_MOVE_MESSAGE', pane: channelId });
    },
    [channelId, dispatch],
  );

  const onDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    async ({ draggableId, source, destination, reason }) => {
      const captured = snapshotRef.current;
      snapshotRef.current = null;
      setSnapshot(null);
      // Finish every drag, including cancellation and invalidated source/target items.
      dispatch({ type: 'FINISH_MOVE_MESSAGE', pane: channelId });
      if (
        reason !== 'DROP' ||
        !destination ||
        source.index === destination.index ||
        destination.droppableId !== channelId ||
        !captured ||
        pendingIdsRef.current.has(draggableId)
      )
        return;

      const messages = store.getState().chatStates.get(channelId)?.itemSet.messages;
      const request =
        messages && prepareMessageMove(captured, messages, draggableId, destination.index);
      if (!request) {
        dispatch(showFlash('WARNING', 'The message or drop target changed. Please drag again.'));
        return;
      }
      pendingIdsRef.current.add(draggableId);
      setPendingIds(new Set(pendingIdsRef.current));
      try {
        const result = await post('/messages/move_between', request);
        // No optimistic position was applied; the server event is authoritative.
        if (!result.isOk) throwErr(dispatch)(result.value);
      } finally {
        pendingIdsRef.current.delete(draggableId);
        setPendingIds(new Set(pendingIdsRef.current));
      }
    },
    [channelId, dispatch],
  );

  return {
    displayedMessages: snapshot ?? filteredMessages,
    pendingIds,
    onBeforeCapture,
    onDragEnd,
  };
}
