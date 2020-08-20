import * as React from 'react';
import { useCallback } from 'react';
import store, { useDispatch, useSelector } from '../../store';
import Loading from '../../components/molecules/Loading';
import { Id } from '../../utils/id';
import { DragDropContext, DragDropContextProps } from 'react-beautiful-dnd';
import ChatVirtualList from './ChatVirtualList';
import { post } from '../../api/request';
import { MoveMessage } from '../../api/messages';
import { MovingMessage, ResetMessageMoving } from '../../actions/chat';
import { throwErr } from '../../utils/errors';

function ChatList() {
  const initialized = useSelector((state) => state.chat!.initialized);
  const channelId = useSelector((state) => state.chat!.channel.id);
  const dispatch = useDispatch();
  const myId: Id | undefined = useSelector(
    (state) => state.profile?.channels.get(state.chat!.channel.id)?.member.userId
  );
  const previewIndex: number | undefined = useSelector((state) => {
    if (myId === undefined) {
      return;
    }
    const previewItem = state.chat!.itemSet.previews.get(myId);
    if (previewItem === undefined) {
      return;
    }
    return state.chat!.itemSet.messages.findLastIndex((item) => item.id === myId);
  });

  const onDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    async ({ draggableId, source, destination }) => {
      dispatch({ type: 'FINISH_MOVE_MESSAGE' });
      const messageId = draggableId;
      if (!destination || source.index === destination.index) {
        return;
      }
      const index = destination.index;
      let mode: MoveMessage['mode'] = 'LATER';
      if (Math.abs(source.index - destination.index) === 1) {
        mode = 'SWAP';
      } else if (source.index > destination.index) {
        mode = 'EARLIER';
      }
      const targetItem = store.getState().chat?.itemSet.messages.get(index);
      if (!targetItem || targetItem.type !== 'MESSAGE') {
        return;
      }
      const targetId = targetItem.id;
      const action: MovingMessage = {
        type: 'MOVING_MESSAGE',
        messageIndex: source.index,
        insertToIndex: source.index > destination.index ? destination.index : destination.index + 1,
      };
      dispatch(action);
      const result = await post('/messages/move', { targetId, messageId, mode });
      if (!result.isOk) {
        const reset: ResetMessageMoving = {
          type: 'RESET_MESSAGE_MOVING',
          messageId,
        };
        dispatch(reset);
        throwErr(dispatch)(result.value);
      }
    },
    [dispatch]
  );

  const onDragStart = useCallback(() => {
    dispatch({ type: 'START_MOVE_MESSAGE' });
  }, [dispatch]);

  if (!initialized) {
    return <Loading text="initialize channel" />;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
      <ChatVirtualList myId={myId} previewIndex={previewIndex} channelId={channelId} />
    </DragDropContext>
  );
}

export default React.memo(ChatList);
