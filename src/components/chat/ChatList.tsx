import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from '../../store';
import { DragDropContext, DragDropContextProps, Droppable } from 'react-beautiful-dnd';
import { AppResult, post } from '../../api/request';
import { FinishMoveMessage, MovingMessage, ResetMessageMoving } from '../../actions/chat';
import { throwErr } from '../../utils/errors';
import { batch } from 'react-redux';
import { showFlash } from '../../actions/flash';
import { usePane } from '../../hooks/usePane';
import { ChatState } from '../../reducers/chat';
import { MessageItem, PreviewItem } from '../../states/chat-item-set';
import ChatItem from './ChatItem';
import LoadMore from './LoadMore';
import { css } from '@emotion/core';
import { Id } from '../../utils/id';
import { blue } from '../../styles/colors';
import { chatPath } from '../../utils/path';
import { useHistory } from 'react-router-dom';

const filterMessages = (filter: ChatState['filter'], showFolded: boolean) => (
  item: PreviewItem | MessageItem
): boolean => {
  const inGame = filter === 'IN_GAME';
  const outGame = filter === 'OUT_GAME';
  if (item.type === 'MESSAGE') {
    const { message } = item;
    if (inGame && !message.inGame) {
      return false;
    }
    if (outGame && message.inGame) {
      return false;
    }
    if (message.folded && !showFolded) {
      return false;
    }
  } else if (item.type === 'PREVIEW') {
    const { preview } = item;
    if (inGame && !preview.inGame) {
      return false;
    }
    if (outGame && preview.inGame) {
      return false;
    }
  }
  return true;
};

const listWrapperStyle = css`
  overflow-y: scroll;
  overflow-x: hidden;

  border: 1px solid ${blue['900']};
  &[data-active='true'] {
    border: 1px solid ${blue['700']};
  }
`;

const useAutoScroll = (chatListRef: React.RefObject<HTMLDivElement>) => {
  const scrollEnd = useRef<number>(0);

  useLayoutEffect(() => {
    if (!chatListRef.current) {
      return;
    }
    const chatList = chatListRef.current;
    const lockSpan = chatList.clientHeight >> 1;
    if (chatList.scrollTop < lockSpan || scrollEnd.current < lockSpan) {
      chatList.scrollTo(0, chatList.scrollHeight - chatList.clientHeight - scrollEnd.current);
    }
  });

  useEffect(() => {
    if (chatListRef.current === null) {
      return;
    }
    const chatList = chatListRef.current;

    const compute = () => {
      scrollEnd.current = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight;
    };
    chatList.addEventListener('scroll', compute, { capture: false, passive: true });
  }, [chatListRef]);
};

function ChatList() {
  const pane = usePane();
  const activePane = useSelector((state) => state.activePane);
  const channelId = useSelector((state) => state.chatPane[pane]!.channel.id);
  const spaceId = useSelector((state) => state.chatPane[pane]!.channel.spaceId);
  const history = useHistory();
  const dispatch = useDispatch();
  const myMember = useSelector((state) => {
    if (state.profile === undefined || state.chatPane[pane] === undefined) {
      return undefined;
    } else {
      return state.profile.channels.get(state.chatPane[pane]!.channel.id)?.member;
    }
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useAutoScroll(wrapperRef);
  const filter = useSelector((state) => state.chatPane[pane]!.filter);
  const showFolded = useSelector((state) => state.chatPane[pane]!.showFolded);
  const messages = useSelector((state) => state.chatPane[pane]!.itemSet.messages);
  const filteredMessages = useMemo(() => {
    const show = filterMessages(filter, showFolded);
    return messages.filter(show);
  }, [messages, filter, showFolded]);
  const onDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    async ({ draggableId, source, destination }) => {
      const finishMove: FinishMoveMessage = { type: 'FINISH_MOVE_MESSAGE', pane };
      const messageId = draggableId;
      if (!destination || source.index === destination.index) {
        dispatch(finishMove);
        return;
      }
      const index = destination.index;
      const sourceItem = filteredMessages.get(source.index);
      if (sourceItem?.type !== 'MESSAGE') {
        return;
      }
      const targetItem = filteredMessages.get(index);
      const action: MovingMessage = {
        type: 'MOVING_MESSAGE',
        message: sourceItem,
        targetItem,
        pane,
      };
      batch(() => {
        dispatch(finishMove);
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
    [dispatch, pane, filteredMessages]
  );

  const onDragStart = useCallback(() => {
    dispatch({ type: 'START_MOVE_MESSAGE', pane });
  }, [dispatch, pane]);

  let prevSender: Id | null = null;
  let prevName: Id | null = null;
  const items = filteredMessages.map((item, index) => {
    let sameSender = false;
    if (item.type === 'MESSAGE' && item.message.senderId === prevSender && item.message.name === prevName) {
      sameSender = true;
    } else if (item.type === 'MESSAGE') {
      prevSender = item.message.senderId;
      prevName = item.message.name;
    } else if (item.type === 'PREVIEW') {
      prevSender = item.preview.senderId;
      prevName = item.preview.name;
    }
    return <ChatItem key={item.id} item={item} myMember={myMember} index={index} sameSender={sameSender} />;
  });

  const setActive = () => {
    if (activePane !== pane) {
      dispatch({ type: 'SWITCH_ACTIVE_PANE', pane });
      history.replace(chatPath(spaceId, channelId));
    }
  };
  return (
    <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
      <div ref={wrapperRef} css={listWrapperStyle} data-active={pane === activePane} onClick={setActive}>
        <Droppable droppableId={channelId} type="CHANNEL">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <LoadMore />
              {items}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}

export default React.memo(ChatList);
