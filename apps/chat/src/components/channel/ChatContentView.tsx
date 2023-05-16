import { DataRef, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { GetMe, Member, Message } from 'api';
import { post } from 'api-browser';
import { useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import type { Dispatch, FC, MutableRefObject, RefObject, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';
import { IS_SAFARI } from '../../const';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { IsScrollingContext } from '../../hooks/useIsScrolling';
import { ScrollerRefContext } from '../../hooks/useScrollerRef';
import { ChatItem } from '../../types/chat-items';
import { ChatListDndContext } from './ChatContentDndContext';
import { ChatContentHeader } from './ChatContentHeader';
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

const itemInsertPos = (item: ChatItem): [number, number] => {
  switch (item.type) {
    case 'PREVIEW':
      return [Math.ceil(item.pos), 1];
    case 'MESSAGE':
      return [item.posP, item.posQ];
  }
};

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
    let range: [[number, number] | null, [number, number] | null] | null = null;
    if (realIndex < targetIndex) {
      const item = chatList[targetIndex]!;
      range = [itemInsertPos(item), null];
    } else {
      const item = chatList[targetIndex]!;
      range = [null, itemInsertPos(item)];
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
  }, [setOptimisticReorder, channelId, resetDragging]);

  const handleDragCancel = useCallback(() => {
    resetDragging();
  }, [resetDragging]);

  return { handleDragStart, handleDragEnd, active: draggingItem, handleDragCancel };
};

const CONTINUOUS_TIME_MS = 5 * 60 * 1000;
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

const useScrollLock = (
  virtuosoRef: RefObject<VirtuosoHandle | null>,
  scrollerRef: RefObject<HTMLDivElement | null>,
  rangeRef: MutableRefObject<[number, number]>,
  chatList: ChatItem[],
): MutableRefObject<ScrollLockState> => {
  const composeAtom = useComposeAtom();
  const store = useStore();
  const scrollLockRef = useRef<ScrollLockState>({ end: true, id: null, modified: 0 });
  const modifiedAtom = useMemo(
    () =>
      selectAtom(
        composeAtom,
        ({ range }) => range,
      ),
    [composeAtom],
  );
  useEffect(() =>
    store.sub(modifiedAtom, () => {
      const { previewId } = store.get(composeAtom);
      if (previewId === null) return;
      scrollLockRef.current.id = previewId;
      scrollLockRef.current.modified = (new Date()).getTime();
    }), [composeAtom, modifiedAtom, store]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      const virtuoso = virtuosoRef.current;
      if (!virtuoso) return;
      const scrollLock = scrollLockRef.current;
      const { modified, end } = scrollLock;
      const now = (new Date()).getTime();
      const id: string | null = now - modified < 1000 ? scrollLock.id : null;
      if (id !== null) {
        const index = chatList.findIndex(item => item.type === 'PREVIEW' && item.id === id);
        const [a, b] = rangeRef.current;
        if (index >= 0 && (index < a || index > b)) {
          virtuoso.scrollToIndex({ index, behavior: 'auto' });
          return;
        }
      }
      if (!end) return;
      virtuoso.scrollToIndex({ index: 'LAST', behavior: 'auto', align: 'end' });
    }, 500);
    return () => window.clearInterval(handle);
  });
  return scrollLockRef;
};

interface ScrollLockState {
  end: boolean;
  id: string | null;
  modified: number;
}

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
  const renderRangeRef = useRef<[number, number]>([0, 0]);

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
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollLockRef = useScrollLock(virtuosoRef, scrollerRef, renderRangeRef, chatList);

  const handleBottomStateChange = (bottom: boolean) => {
    goBottomButtonOnBottomChange(bottom);
    scrollLockRef.current.end = bottom;
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
        <ScrollerRefContext.Provider value={scrollerRef}>
          <IsScrollingContext.Provider value={isScrolling}>
            <SortableContext items={chatList} strategy={verticalListSortingStrategy}>
              <Virtuoso
                className="overflow-x-hidden"
                firstItemIndex={firstItemIndex}
                rangeChanged={({ startIndex, endIndex }) =>
                  renderRangeRef.current = [startIndex - firstItemIndex, endIndex - firstItemIndex]}
                ref={virtuosoRef}
                scrollerRef={(ref) => {
                  if (ref instanceof HTMLDivElement || ref === null) scrollerRef.current = ref;
                }}
                components={{ Header: ChatContentHeader }}
                initialTopMostItemIndex={{ index: totalCount - 1, align: 'end' }}
                totalCount={totalCount}
                atBottomThreshold={64}
                increaseViewportBy={{ top: 512, bottom: 128 }}
                overscan={{ main: 128, reverse: 512 }}
                isScrolling={setIsScrolling}
                itemContent={itemContent}
                followOutput="auto"
                atBottomStateChange={handleBottomStateChange}
              />
              {showButton && <GoButtomButton onClick={goBottom} />}
            </SortableContext>
          </IsScrollingContext.Provider>
        </ScrollerRefContext.Provider>
      </ChatListDndContext>
    </div>
  );
};
