import { DataRef, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { GetMe, Member, Message } from 'api';
import { usePost } from 'common';
import type { Dispatch, FC, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';
import { useChannelId } from '../../hooks/useChannelId';
import { useChatDispatch } from '../../state/atoms/chat';
import { ChatItem } from '../../types/chat-items';
import { ChatListDndContext } from './ChatContentDndContext';
import { ChatListHeader } from './ChatContentHeader';
import { ChatItemMessage } from './ChatItemMessage';
import { ChatItemSwitch } from './ChatItemSwitch';
import { GoButtomButton } from './GoBottomButton';

interface Props {
  chatList: ChatItem[];
  me: GetMe | null;
  myMember: Member | null;
  className?: string;
}

const START_INDEX = Number.MAX_SAFE_INTEGER - 10000000;
const SHOW_BOTTOM_BUTTON_TIMEOUT = 500;
const OPTIMISTIC_REORDER_TIMEOUT = 2000;

interface UseScrollToBottom {
  showButton: boolean;
  bottomStateChange: (bottom: boolean) => void;
}

const useScrollToBottom = (): UseScrollToBottom => {
  // ref: https://virtuoso.dev/stick-to-bottom/
  const [showButton, setShowButton] = useState(false);
  const showButtonTimeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(showButtonTimeoutRef.current));
  const bottomStateChange = useCallback((bottom: boolean) => {
    window.clearTimeout(showButtonTimeoutRef.current);
    if (bottom) {
      setShowButton(false);
    } else {
      showButtonTimeoutRef.current = window.setTimeout(() => setShowButton(true), SHOW_BOTTOM_BUTTON_TIMEOUT);
    }
  }, []);
  return { showButton, bottomStateChange };
};

interface SortableData {
  message: Message;
  sortable: {
    index: number;
  };
}

export interface DraggingItem {
  realIndex: number;
  message: Message;
}

interface OptimisticItem {
  realIndex: number;
  optimisticIndex: number;
  message: Message;
}

type SetOptimisticReorder = Dispatch<SetStateAction<OptimisticItem | null>>;

interface UseDerivedChatListReturn {
  optimisticReorder: OptimisticItem | null;
  chatList: ChatItem[];
  setOptimisticReorder: SetOptimisticReorder;
  firstItemIndex: number;
}

const useDerivedChatList = (actualChatList: ChatItem[]): UseDerivedChatListReturn => {
  const [optimisticReorder, setOptimisticReorder] = useState<OptimisticItem | null>(null);

  // Reset the optimistic reorder when messages changed
  if (optimisticReorder !== null) {
    const item = actualChatList[optimisticReorder.realIndex];
    if (!item || item.id !== optimisticReorder.message.id) {
      // Directly set state to avoid re-render
      // https://beta.reactjs.org/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
      setOptimisticReorder(null);
    }
  }

  // Reset the optimistic reorder after timeout
  useEffect(() => {
    if (optimisticReorder === null) return;
    const timeout = window.setTimeout(() => setOptimisticReorder(null), OPTIMISTIC_REORDER_TIMEOUT);
    return () => window.clearTimeout(timeout);
  }, [optimisticReorder]);

  const optimisticChatList = useMemo(() => {
    if (optimisticReorder === null) return actualChatList;
    const { realIndex, optimisticIndex } = optimisticReorder;
    if (realIndex === optimisticIndex) return actualChatList;
    const newMessages = [...actualChatList];
    const message = newMessages.splice(realIndex, 1)[0]!;
    newMessages.splice(optimisticIndex, 0, message);
    return newMessages;
  }, [optimisticReorder, actualChatList]);

  const chatList = optimisticChatList;

  // for prepending items https://virtuoso.dev/prepend-items/
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  const prevChatListRef = useRef<ChatItem[]>();
  if (prevChatListRef.current) {
    const prevChatList = prevChatListRef.current;
    if (prevChatList.length > 0 && chatList.length > prevChatList.length && prevChatList[0]!.id !== chatList[0]!.id) {
      setFirstItemIndex((prevIndex) => prevIndex - (chatList.length - prevChatList.length));
      setOptimisticReorder(null);
    }
  }
  prevChatListRef.current = chatList;

  return { chatList, optimisticReorder, setOptimisticReorder, firstItemIndex };
};

interface UseDragHandlesResult {
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  active: DraggingItem | null;
  handleDragCancel: () => void;
}

const useDndHandles = (
  channelId: string,
  derivedChatList: ChatItem[],
  setOptimisticReorder: SetOptimisticReorder,
): UseDragHandlesResult => {
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null);
  const activeRef = useRef<DraggingItem | null>(draggingItem);
  activeRef.current = draggingItem;
  const chatListRef = useRef<ChatItem[]>(derivedChatList);
  chatListRef.current = derivedChatList;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data as DataRef<SortableData>;
    if (!data.current) return;
    const { message, sortable } = data.current;
    setDraggingItem({ realIndex: sortable.index, message });
    setOptimisticReorder(null);
  }, [setOptimisticReorder]);
  const resetDragging = useCallback(() => setDraggingItem(null), []);
  const post = usePost();

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const active = activeRef.current;
    const chatList = chatListRef.current;
    const messagesCount = chatList.length;
    if (active === null) return;
    resetDragging();
    if (messagesCount < 2 || !event.over) {
      return;
    }
    const overData = event.over.data as DataRef<SortableData>;
    if (!overData.current) return;
    const { sortable } = overData.current;
    const { realIndex, message: draggingMessage } = active;
    const targetIndex = sortable.index;
    if (realIndex === targetIndex) return;
    resetDragging();
    setOptimisticReorder({
      message: draggingMessage,
      realIndex,
      optimisticIndex: targetIndex,
    });
    let range: [number | null, number | null] | null = null;
    if (realIndex < targetIndex) {
      range = [chatList[targetIndex]!.pos, null];
    } else {
      range = [null, chatList[targetIndex]!.pos];
    }
    if (range) {
      const result = await post('/messages/move_between', null, {
        channelId,
        messageId: draggingMessage.id,
        range,
      });
      if (result.isErr) {
        // TODO: handle error
      }
    }
    setOptimisticReorder(null);
  }, [setOptimisticReorder, post, channelId, resetDragging]);

  const handleDragCancel = useCallback(() => {
    resetDragging();
  }, [resetDragging]);

  return { handleDragStart, handleDragEnd, active: draggingItem, handleDragCancel };
};

const CONTINUOUS_TIME_MS = 60 * 1000;
const isContinuous = (a: ChatItem | null | undefined, b: ChatItem): boolean => {
  if (
    a == null || a.type !== 'MESSAGE' || b.type !== 'MESSAGE' // type
    || a.senderId !== b.senderId || a.name !== b.name // sender
    || a.folded || b.folded || a.whisperToUsers || b.whisperToUsers // other
  ) {
    return false;
  }
  const timeDiff = Math.abs(Date.parse(a.created) - Date.parse(b.created));
  return timeDiff < CONTINUOUS_TIME_MS;
};

export const ChatContentView: FC<Props> = ({ className = '', chatList: actualChatList, me, myMember }) => {
  const dispatch = useChatDispatch();
  const channelId = useChannelId();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const { showButton, bottomStateChange } = useScrollToBottom();

  const { chatList, optimisticReorder, setOptimisticReorder, firstItemIndex } = useDerivedChatList(
    actualChatList,
  );
  const totalCount = chatList.length;
  const goButtom = useCallback(
    () => {
      const virtuoso = virtuosoRef.current;
      if (!virtuoso) return;
      virtuoso.scrollToIndex({ index: totalCount - 1, behavior: 'smooth' });
    },
    [totalCount],
  );
  const handleBottomStateChange = useCallback(() => (bottom: boolean) => {
    bottomStateChange(bottom);
    if (bottom) {
      dispatch('reachBottom', { channelId });
    }
  }, [bottomStateChange, channelId, dispatch]);

  const { handleDragStart, handleDragEnd, active, handleDragCancel } = useDndHandles(
    channelId,
    chatList,
    setOptimisticReorder,
  );

  const itemContent = (offsetIndex: number) => {
    const index = offsetIndex - firstItemIndex;
    const item = chatList[index]!;
    if (optimisticReorder?.optimisticIndex === index) {
      const { message } = optimisticReorder;
      return <ChatItemMessage message={message} key={message.id} self={message.senderId === me?.user.id} />;
    }
    return (
      <ChatItemSwitch
        key={item.key}
        myId={me?.user.id}
        chatItem={item}
        isMember={myMember !== null}
        continuous={isContinuous(chatList[index - 1], item)}
      />
    );
  };
  return (
    <div className={className}>
      <ChatListDndContext
        active={active}
        myId={me?.user.id}
        onDragCancel={handleDragCancel}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={chatList} strategy={verticalListSortingStrategy}>
          <Virtuoso
            firstItemIndex={firstItemIndex}
            ref={virtuosoRef}
            components={{ Header: ChatListHeader }}
            initialTopMostItemIndex={totalCount - 1}
            totalCount={totalCount}
            followOutput="auto"
            itemContent={itemContent}
            atBottomStateChange={handleBottomStateChange}
          />
          {showButton && <GoButtomButton onClick={goButtom} />}
        </SortableContext>
      </ChatListDndContext>
    </div>
  );
};
