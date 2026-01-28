import { css } from '@emotion/react';
import { type List } from 'immutable';
import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DragDropContext, type DragDropContextProps, Droppable } from '@hello-pangea/dnd';
import { type FinishMoveMessage, type ResetMessageMoving } from '../../actions';
import { post } from '../../api/request';
import { usePane } from '../../hooks/useChannelId';
import { type ChatState } from '../../reducers/chatState';
import { type MessageItem, type PreviewItem } from '../../states/chat-item-set';
import { useDispatch, useSelector } from '../../store';
import { blue } from '../../styles/colors';
import { throwErr } from '../../utils/errors';
import { type Id } from '../../utils/id';
import ChatItem from './ChatItem';
import LoadMore from './LoadMore';

const filterMessages =
  (filter: ChatState['filter'], showFolded: boolean) =>
  (item: PreviewItem | MessageItem): boolean => {
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

const findMessageFrom = (
  items: List<MessageItem | PreviewItem>,
  startIndex: number,
  step: number,
  excludeId: Id,
): MessageItem | null => {
  for (let i = startIndex; i >= 0 && i < items.size; i += step) {
    const item = items.get(i);
    if (!item || item.id === excludeId) {
      continue;
    }
    if (item.type === 'MESSAGE') {
      return item;
    }
  }
  return null;
};

const areAdjacentInAllMessages = (
  allMessages: List<MessageItem>,
  aId: Id,
  bId: Id,
): boolean => {
  const aIndex = allMessages.findIndex((item) => item.id === aId);
  const bIndex = allMessages.findIndex((item) => item.id === bId);
  if (aIndex === -1 || bIndex === -1) {
    return false;
  }
  return Math.abs(aIndex - bIndex) === 1;
};

const useAutoScroll = (chatListRef: React.RefObject<HTMLDivElement | null>) => {
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
    if (chatListRef.current == null) {
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
  filteredMessages: List<MessageItem | PreviewItem>,
  allMessages: List<MessageItem>,
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
      const movingUp = source.index > destination.index;
      const lower = movingUp
        ? findMessageFrom(filteredMessages, destination.index - 1, -1, messageId)
        : findMessageFrom(filteredMessages, destination.index, -1, messageId);
      const upper = movingUp
        ? findMessageFrom(filteredMessages, destination.index, 1, messageId)
        : findMessageFrom(filteredMessages, destination.index + 1, 1, messageId);
      dispatch(finishMove);

      if (!lower && !upper) {
        console.warn('no target item');
        return;
      }

      // Avoid using preview positions or filtered gaps as bounds; rely on DB neighbors when needed.
      let range: [[number, number] | null, [number, number] | null] | null = null;
      if (lower && upper && areAdjacentInAllMessages(allMessages, lower.id, upper.id)) {
        range = [
          [lower.message.posP, lower.message.posQ],
          [upper.message.posP, upper.message.posQ],
        ];
      } else if (movingUp) {
        if (upper) {
          range = [null, [upper.message.posP, upper.message.posQ]];
        } else if (lower) {
          range = [[lower.message.posP, lower.message.posQ], null];
        }
      } else if (lower) {
        range = [[lower.message.posP, lower.message.posQ], null];
      } else if (upper) {
        range = [null, [upper.message.posP, upper.message.posQ]];
      }

      if (!range) {
        console.warn('no target range');
        return;
      }

      const result = await post('/messages/move_between', {
        messageId,
        channelId,
        expectPos: [sourceItem.message.posP, sourceItem.message.posQ],
        range,
      });
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
    [allMessages, channelId, dispatch, filteredMessages],
  );
}

interface Props {
  channelId: Id;
  focus: () => void;
}

function ChatList({ channelId, focus }: Props) {
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
  const paneInfo = usePane();
  const filter = useSelector((state) => state.chatStates.get(channelId)!.filter);
  const showFolded = useSelector((state) => state.chatStates.get(channelId)!.showFolded);
  const messages = useSelector((state) => state.chatStates.get(channelId)!.itemSet.messages);
  const allMessages = useMemo(
    () => messages.filter((item) => item.type === 'MESSAGE') as List<MessageItem>,
    [messages],
  );
  const filteredMessages = useMemo(() => {
    const show = filterMessages(filter, showFolded);
    return messages.filter(show);
  }, [messages, filter, showFolded]);
  const onDragEnd: DragDropContextProps['onDragEnd'] = useOnDragEnd(
    channelId,
    filteredMessages,
    allMessages,
  );

  const onDragStart = useCallback(() => {
    dispatch({ type: 'START_MOVE_MESSAGE', pane: channelId });
  }, [dispatch, channelId]);

  let prevSender: Id | null = null;
  let prevName: Id | null = null;
  const items = filteredMessages.map((item, index) => {
    let sameSender = false;
    if (
      item.type === 'MESSAGE' &&
      item.message.senderId === prevSender &&
      item.message.name === prevName
    ) {
      sameSender = true;
    } else if (item.type === 'MESSAGE') {
      prevSender = item.message.senderId;
      prevName = item.message.name;
    } else if (item.type === 'PREVIEW') {
      prevSender = item.preview.senderId;
      prevName = item.preview.name;
    }
    return (
      <ChatItem
        key={item.id}
        item={item}
        myMember={myMember}
        index={index}
        sameSender={sameSender}
      />
    );
  });

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
      <div ref={wrapperRef} css={listWrapperStyle} onClick={focus} data-active={paneInfo.isFocused}>
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
