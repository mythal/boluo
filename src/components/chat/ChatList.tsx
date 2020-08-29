import * as React from 'react';
import { useCallback } from 'react';
import store, { useDispatch, useSelector } from '../../store';
import { DragDropContext, DragDropContextProps } from 'react-beautiful-dnd';
import ChatVirtualList from './VirtualList';
import { AppResult, post } from '../../api/request';
import { MovingMessage, ResetMessageMoving } from '../../actions/chat';
import { throwErr } from '../../utils/errors';
import { batch } from 'react-redux';
import { showFlash } from '../../actions/flash';
import { usePane } from '../../hooks/usePane';

function ChatList() {
  const pane = usePane();
  const channelId = useSelector((state) => state.chatPane[pane]!.channel.id);
  const dispatch = useDispatch();
  const myMember = useSelector((state) => {
    if (state.profile === undefined || state.chatPane[pane] === undefined) {
      return undefined;
    } else {
      return state.profile.channels.get(state.chatPane[pane]!.channel.id)?.member;
    }
  });

  const onDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    async ({ draggableId, source, destination }) => {
      const messageId = draggableId;
      if (!destination || source.index === destination.index) {
        return;
      }
      const index = destination.index;
      const targetItem = store.getState().chatPane[pane]?.itemSet.messages.get(index);
      const action: MovingMessage = {
        type: 'MOVING_MESSAGE',
        messageIndex: source.index,
        insertToIndex: source.index > destination.index ? destination.index : destination.index + 1,
        pane,
      };
      batch(() => {
        dispatch({ type: 'FINISH_MOVE_MESSAGE', pane });
        dispatch(action);
      });

      let result: AppResult<true>;
      if (Math.abs(source.index - destination.index) === 1 && targetItem?.type === 'MESSAGE') {
        result = await post('/messages/swap', {}, { a: messageId, b: targetItem.id });
      } else {
        const orderDate = targetItem ? targetItem.date : new Date().getTime();
        const orderOffset = targetItem ? targetItem.offset : 42;
        const mode: 'TOP' | 'BOTTOM' = source.index > destination.index ? 'TOP' : 'BOTTOM';

        if (!Number.isInteger(orderOffset)) {
          batch(() => {
            dispatch(showFlash('WARNING', '还有消息正在拖动中'));

            const reset: ResetMessageMoving = {
              type: 'RESET_MESSAGE_MOVING',
              messageId,
              pane,
            };
            dispatch(reset);
          });
          return;
        }
        result = await post('/messages/move_to', { messageId, orderDate, orderOffset, mode });
      }
      if (!result.isOk) {
        const reset: ResetMessageMoving = {
          type: 'RESET_MESSAGE_MOVING',
          messageId,
          pane,
        };
        dispatch(reset);
        throwErr(dispatch)(result.value);
      }
    },
    [dispatch, pane]
  );

  const onDragStart = useCallback(() => {
    dispatch({ type: 'START_MOVE_MESSAGE', pane });
  }, [dispatch, pane]);

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
      <ChatVirtualList myMember={myMember} channelId={channelId} />
    </DragDropContext>
  );
}

export default React.memo(ChatList);
