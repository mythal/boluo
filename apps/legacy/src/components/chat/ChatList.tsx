import * as React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { usePane } from '../../hooks/useChannelId';
import { type ChatState } from '../../reducers/chatState';
import { type MessageItem, type PreviewItem } from '../../states/chat-item-set';
import { useSelector } from '../../store';
import { type Id } from '../../utils/id';
import ChatItem from './ChatItem';
import LoadMore from './LoadMore';
import { useMessageDrag } from './use-message-drag';

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

interface Props {
  channelId: Id;
  focus: () => void;
}

function ChatList({ channelId, focus }: Props) {
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
  const { displayedMessages, pendingIds, onBeforeCapture, onDragEnd } = useMessageDrag(
    channelId,
    filteredMessages,
  );

  let prevSender: Id | null = null;
  let prevName: Id | null = null;
  const items = displayedMessages.map((item, index) => {
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
        movePending={pendingIds.has(item.id)}
      />
    );
  });

  return (
    <DragDropContext onDragEnd={onDragEnd} onBeforeCapture={onBeforeCapture}>
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
