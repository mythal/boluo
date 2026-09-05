import { type List } from 'immutable';
import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DragDropContext, type DragDropContextProps, Droppable } from '@hello-pangea/dnd';
import { type FinishMoveMessage, type ResetMessageMoving } from '../../actions';
import { post } from '../../api/request';
import { recordWarning } from '../../error-reporting';
import { usePane } from '../../hooks/useChannelId';
import { type ChatState } from '../../reducers/chatState';
import { type MessageItem, type PreviewItem } from '../../states/chat-item-set';
import { useDispatch, useSelector } from '../../store';
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

const itemPos = (item: PreviewItem | MessageItem | undefined | null): [number, number] | null => {
  if (!item) {
    return null;
  }
  switch (item.type) {
    case 'MESSAGE':
      return [item.message.posP, item.message.posQ];
    case 'PREVIEW':
      return [Math.ceil(item.preview.pos), 1];
  }
};

/**
 * `/messages/move_between` assumes the range it receives is empty and picks the simplest
 * fraction inside it, so the neighbor must come from the unfiltered item set.
 */
const neighborPos = (
  messages: List<MessageItem | PreviewItem>,
  anchor: MessageItem | PreviewItem,
  direction: 'BEFORE' | 'AFTER',
): [number, number] | null => {
  const neighbor =
    direction === 'AFTER'
      ? messages.find((item) => item.pos > anchor.pos)
      : messages.findLast((item) => item.pos < anchor.pos);
  const pos = itemPos(neighbor);
  const anchorPos = itemPos(anchor);
  if (pos == null || anchorPos == null) return null;
  // `itemPos` rounds preview positions up, which can land on or past the anchor.
  const beyondAnchor =
    direction === 'AFTER'
      ? pos[0] / pos[1] > anchorPos[0] / anchorPos[1]
      : pos[0] / pos[1] < anchorPos[0] / anchorPos[1];
  return beyondAnchor ? pos : null;
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
    return () => {
      chatList.removeEventListener('scroll', compute, { capture: false });
    };
  }, [chatListRef]);
};

function useOnDragEnd(
  channelId: Id,
  filteredMessages: List<MessageItem | PreviewItem>,
  messages: List<MessageItem | PreviewItem>,
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
      const anchor = filteredMessages.get(destination.index, null);
      const [a, b] =
        source.index > destination.index
          ? [anchor ? neighborPos(messages, anchor, 'BEFORE') : null, itemPos(anchor)]
          : [itemPos(anchor), anchor ? neighborPos(messages, anchor, 'AFTER') : null];
      dispatch(finishMove);

      if (a === null && b === null) {
        recordWarning('No target item while moving a message', { source: 'move-message' });
        return;
      }

      const result = await post('/messages/move_between', {
        messageId,
        channelId,
        expectPos: [sourceItem.message.posP, sourceItem.message.posQ],
        range: [a, b],
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
    [channelId, dispatch, filteredMessages, messages],
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
  const filteredMessages = useMemo(() => {
    const show = filterMessages(filter, showFolded);
    return messages.filter(show);
  }, [messages, filter, showFolded]);
  const onDragEnd: DragDropContextProps['onDragEnd'] = useOnDragEnd(
    channelId,
    filteredMessages,
    messages,
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
      <div
        ref={wrapperRef}
        className="border-legacy-blue-900 data-[active=true]:border-legacy-blue-700 overflow-x-hidden overflow-y-scroll border"
        onClick={focus}
        data-active={paneInfo.isFocused}
      >
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
