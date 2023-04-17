import { DataRef, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { GetMe, Member, Message } from 'api';
import { usePost } from 'common';
import type { Dispatch, FC, MutableRefObject, RefObject, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';
import { useChannelId } from '../../hooks/useChannelId';
import { IsScrollingContext } from '../../hooks/useIsScrolling';
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
const SHOW_BOTTOM_BUTTON_TIMEOUT = 2000;
const OPTIMISTIC_REORDER_TIMEOUT = 2000;

interface UseScrollToBottom {
  showButton: boolean;
  onBottomStateChange: (bottom: boolean) => void;
  goBottom: () => void;
}

const useScrollToBottom = (virtuosoRef: RefObject<VirtuosoHandle | null>): UseScrollToBottom => {
  // ref: https://virtuoso.dev/stick-to-bottom/
  const [showButton, setShowButton] = useState(false);
  const showButtonTimeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(showButtonTimeoutRef.current));
  const onBottomStateChange = useCallback((bottom: boolean) => {
    window.clearTimeout(showButtonTimeoutRef.current);
    if (bottom) {
      setShowButton(false);
    } else {
      showButtonTimeoutRef.current = window.setTimeout(() => setShowButton(true), SHOW_BOTTOM_BUTTON_TIMEOUT);
    }
  }, []);

  const goBottom = useCallback(() => {
    const virtuoso = virtuosoRef.current;
    if (!virtuoso) return;
    virtuoso.scrollToIndex({ index: 'LAST', behavior: 'smooth' });
  }, [virtuosoRef]);
  return { showButton, onBottomStateChange, goBottom };
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

interface UseAutoScrollReturn {
  scrollerRef: MutableRefObject<HTMLDivElement | null>;
  boxRef: MutableRefObject<HTMLDivElement | null>;
  onBottomStateChange: (bottom: boolean) => void;
}

const useAutoScroll = (virtuosoRef: RefObject<VirtuosoHandle | null>): UseAutoScrollReturn => {
  const lockBottomRef = useRef(true);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);
  const viewportBottomIndexRef = useRef<number | 'LAST'>('LAST');

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        const index = viewportBottomIndexRef.current;
        virtuosoRef.current?.scrollToIndex({ index, align: 'end', behavior: 'auto' });
      }, 0);
    });
    resizeObserver.observe(box);
    return () => resizeObserver.disconnect();
  }, [virtuosoRef]);

  useEffect(() => {
    const ref = scrollerRef.current;
    if (!ref) return;

    let prevScrollTop = Number.MAX_SAFE_INTEGER;
    const onScroll = () => {
      const scrollTop = ref.scrollTop;
      if (!lockBottomRef.current) {
      } else {
        const scrollBottom = ref.scrollHeight - scrollTop - ref.offsetHeight;
        if (prevScrollTop - scrollTop > 2 && scrollBottom > 2) {
          lockBottomRef.current = false;
        }
      }
      prevScrollTop = scrollTop;
    };
    ref.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ref.removeEventListener('scroll', onScroll);
    };
  }, []);
  const onBottomStateChange = useCallback((bottom: boolean) => {
    if (bottom) {
      if (!lockBottomRef.current) {
        console.log('lock to bottom');
        lockBottomRef.current = true;
      }
    } else {
      if (lockBottomRef.current) {
        virtuosoRef.current?.scrollTo({ top: Number.MAX_SAFE_INTEGER, behavior: 'smooth' });
      }
    }
  }, [virtuosoRef]);
  return { scrollerRef, boxRef, onBottomStateChange };
};

export const ChatContentView: FC<Props> = ({ className = '', chatList: actualChatList, me, myMember }) => {
  const channelId = useChannelId();
  const [isScrolling, setIsScrolling] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const { showButton, onBottomStateChange: goBottomButtonOnBottomChange, goBottom } = useScrollToBottom(virtuosoRef);

  const { chatList, optimisticReorder, setOptimisticReorder, firstItemIndex } = useDerivedChatList(
    actualChatList,
  );
  const totalCount = chatList.length;

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
  const { scrollerRef, boxRef, onBottomStateChange: autoScrollOnBottomChange } = useAutoScroll(virtuosoRef);

  const handleBottomStateChange = (bottom: boolean) => {
    goBottomButtonOnBottomChange(bottom);
    autoScrollOnBottomChange(bottom);
  };

  return (
    <div className={className} ref={boxRef}>
      <ChatListDndContext
        active={active}
        myId={me?.user.id}
        onDragCancel={handleDragCancel}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <IsScrollingContext.Provider value={isScrolling}>
          <SortableContext items={chatList} strategy={verticalListSortingStrategy}>
            <Virtuoso
              firstItemIndex={firstItemIndex}
              ref={virtuosoRef}
              scrollerRef={(ref) => {
                if (ref instanceof HTMLDivElement || ref === null) scrollerRef.current = ref;
              }}
              components={{ Header: ChatListHeader }}
              initialTopMostItemIndex={totalCount - 1}
              totalCount={totalCount}
              isScrolling={setIsScrolling}
              alignToBottom
              itemContent={itemContent}
              followOutput="auto"
              atBottomStateChange={handleBottomStateChange}
            />
            {showButton && <GoButtomButton onClick={goBottom} />}
          </SortableContext>
        </IsScrollingContext.Provider>
      </ChatListDndContext>
    </div>
  );
};
