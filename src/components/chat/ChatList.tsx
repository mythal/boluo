import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from '../../store';
import { DragDropContext, DragDropContextProps, Droppable } from 'react-beautiful-dnd';
import { post } from '../../api/request';
import { FinishMoveMessage, ResetMessageMoving } from '../../actions/chat';
import { throwErr } from '../../utils/errors';
import { ChatState } from '../../reducers/chatState';
import { MessageItem, PreviewItem } from '../../states/chat-item-set';
import ChatItem from './ChatItem';
import LoadMore from './LoadMore';
import { css } from '@emotion/core';
import { Id } from '../../utils/id';
import { blue } from '../../styles/colors';
import { List } from 'immutable';

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

function useOnDragEnd(
  channelId: Id,
  filteredMessages: List<MessageItem | PreviewItem>
): DragDropContextProps['onDragEnd'] {
  const dispatch = useDispatch();

  return useCallback(
    async ({ draggableId, source, destination }) => {
      const finishMove: FinishMoveMessage = { type: 'FINISH_MOVE_MESSAGE', pane: channelId };
      const messageId = draggableId;
      if (!destination || source.index === destination.index) {
        dispatch(finishMove);
        return;
      }
      const sourceItem = filteredMessages.get(source.index);
      if (sourceItem?.type !== 'MESSAGE') {
        return;
      }
      let a: number | null = null;
      let b: number | null = null;
      if (source.index > destination.index) {
        if (destination.index > 0) {
          a = filteredMessages.get(destination.index - 1, null)?.pos ?? null;
        }
        b = filteredMessages.get(destination.index, null)?.pos ?? null;
      } else {
        a = filteredMessages.get(destination.index, null)?.pos ?? null;
        b = filteredMessages.get(destination.index + 1, null)?.pos ?? null;
      }
      dispatch(finishMove);

      if (a === undefined && b === undefined) {
        console.warn('no target item');
        return;
      }

      const result = await post('/messages/move_between', { messageId, channelId, range: [a, b] });
      if (!result.isOk) {
        const reset: ResetMessageMoving = {
          type: 'RESET_MESSAGE_MOVING',
          messageId,
          pane: channelId,
        };
        dispatch(reset);
        throwErr(dispatch)(result.value);
      }
    },
    [channelId, dispatch, filteredMessages]
  );
}

interface Props {
  channelId: Id;
}

function ChatList({ channelId }: Props) {
  const dispatch = useDispatch();
  const myMember = useSelector((state) => {
    if (state.profile === undefined || state.chatStates.get(channelId) === undefined) {
      return undefined;
    } else {
      return state.profile.channels.get(state.chatStates.get(channelId)!.channel.id)?.member;
    }
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useAutoScroll(wrapperRef);
  const filter = useSelector((state) => state.chatStates.get(channelId)!.filter);
  const showFolded = useSelector((state) => state.chatStates.get(channelId)!.showFolded);
  const messages = useSelector((state) => state.chatStates.get(channelId)!.itemSet.messages);
  const filteredMessages = useMemo(() => {
    const show = filterMessages(filter, showFolded);
    return messages.filter(show);
  }, [messages, filter, showFolded]);
  const onDragEnd: DragDropContextProps['onDragEnd'] = useOnDragEnd(channelId, filteredMessages);

  const onDragStart = useCallback(() => {
    dispatch({ type: 'START_MOVE_MESSAGE', pane: channelId });
  }, [dispatch, channelId]);

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

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
      <div ref={wrapperRef} css={listWrapperStyle}>
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
