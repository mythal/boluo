import { DataRef, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { GetMe, Member } from 'api';
import { post } from 'api-browser';
import { useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import type { FC, MutableRefObject, RefObject } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { useChannelId } from '../../hooks/useChannelId';
import { SetOptimisticItems, useChatList } from '../../hooks/useChatList';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { ScrollerRefContext } from '../../hooks/useScrollerRef';
import { ChatItem, MessageItem } from '../../state/channel.types';
import { ChatListDndContext } from './ChatContentDndContext';
import { ChatContentVirtualList } from './ChatContentVirtualList';
import { GoButtomButton } from './GoBottomButton';

interface Props {
  me: GetMe | null;
  myMember: Member | null;
  className?: string;
}

const SHOW_BOTTOM_BUTTON_TIMEOUT = 2000;

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
  message: MessageItem;
  sortable: {
    index: number;
  };
}

export interface DraggingItem {
  realIndex: number;
  message: MessageItem;
}

interface UseDragHandlesResult {
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  active: DraggingItem | null;
  handleDragCancel: () => void;
}

const useDndHandles = (
  channelId: string,
  chatList: ChatItem[],
  setOptimisticItems: SetOptimisticItems,
): UseDragHandlesResult => {
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null);
  const activeRef = useRef<DraggingItem | null>(draggingItem);
  activeRef.current = draggingItem;

  const chatListRef = useRef<ChatItem[]>(chatList);
  chatListRef.current = chatList;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data as DataRef<SortableData>;
    if (!data.current) return;
    const { message, sortable } = data.current;
    setDraggingItem({ realIndex: sortable.index, message });
  }, []);
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
    const targetItem = chatList[targetIndex];
    if (!targetItem) {
      console.warn('Lost the target item when drag end');
      return;
    }
    const timestamp = new Date().getTime();
    const item: MessageItem = { ...draggingMessage, optimistic: true };
    let range: [[number, number] | null, [number, number] | null] | null = null;
    if (realIndex < targetIndex) {
      range = [[targetItem.posP, targetItem.posQ], null];
      const targetNext = chatList[targetIndex + 1];
      const optimisticPos = targetNext
        ? (targetNext.pos + targetItem.pos) / 2
        : (targetItem.posP + 1) / targetItem.posQ;

      setOptimisticItems((items) => ({
        ...items,
        [draggingMessage.id]: { item, optimisticPos, timestamp },
      }));
    } else {
      range = [null, [targetItem.posP, targetItem.posQ]];

      const targetBefore = chatList[targetIndex - 1];

      const optimisticPos = targetBefore
        ? (targetBefore.pos + targetItem.pos) / 2
        : targetItem.posP / targetItem.posQ + 1;

      setOptimisticItems((items) => ({
        ...items,
        [draggingMessage.id]: { item, optimisticPos, timestamp },
      }));
    }
    if (range) {
      const result = await post('/messages/move_between', null, {
        channelId,
        messageId: draggingMessage.id,
        range,
      });
      setOptimisticItems(items => {
        const nextItems = { ...items };
        delete nextItems[draggingMessage.id];
        return nextItems;
      });
      if (result.isErr) {
        // TODO: handle error
      }
    }
  }, [setOptimisticItems, channelId, resetDragging]);

  const handleDragCancel = useCallback(() => {
    resetDragging();
  }, [resetDragging]);

  return { handleDragStart, handleDragEnd, active: draggingItem, handleDragCancel };
};

interface ScrollLockState {
  end: boolean;
  /** The id of current preview */
  id: string | null;
  modified: number;
}

const PREVIEW_LOCK_TIMEOUT = 1000;

const useScrollLock = (
  virtuosoRef: RefObject<VirtuosoHandle | null>,
  scrollerRef: RefObject<HTMLDivElement | null>,
  wrapperRef: RefObject<HTMLDivElement | null>,
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
    const callback = () => {
      const virtuoso = virtuosoRef.current;
      if (!virtuoso) return;
      const scrollLock = scrollLockRef.current;
      const { modified, end } = scrollLock;
      const now = (new Date()).getTime();
      // lock on a preview only if it is recently modified
      const id: string | null = now - modified < PREVIEW_LOCK_TIMEOUT ? scrollLock.id : null;
      if (id !== null) {
        const index = chatList.findIndex(item => item.type === 'PREVIEW' && item.id === id);
        const [a, b] = rangeRef.current;
        // If the preview is not rendered, scroll to it
        // The more precisly scrolling will be done by the cursor element
        if (index >= 0 && (index < a || index > b)) {
          virtuoso.scrollToIndex({ index, behavior: 'auto' });
        }
      } else if (end) {
        virtuoso.scrollToIndex({ index: 'LAST', behavior: 'auto', align: 'end' });
      }
    };
    const scroller = scrollerRef.current;
    const wrapper = wrapperRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      callback();
    });
    if (scroller) resizeObserver.observe(scroller);
    if (wrapper) resizeObserver.observe(wrapper);
    const handle = window.setInterval(callback, 2000);
    return () => {
      window.clearInterval(handle);
      resizeObserver.disconnect();
    };
  });
  return scrollLockRef;
};

export const ChatContentView: FC<Props> = ({ className = '', me, myMember }) => {
  const channelId = useChannelId();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const { showButton, onBottomStateChange: goBottomButtonOnBottomChange, goBottom } = useScrollToBottom(virtuosoRef);
  const { chatList, setOptimisticItems, firstItemIndex, filteredMessagesCount } = useChatList(channelId, me?.user.id);

  const { handleDragStart, handleDragEnd, active, handleDragCancel } = useDndHandles(
    channelId,
    chatList,
    setOptimisticItems,
  );
  const renderRangeRef = useRef<[number, number]>([0, 0]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const scrollLockRef = useScrollLock(virtuosoRef, scrollerRef, wrapperRef, renderRangeRef, chatList);

  const handleBottomStateChange = (bottom: boolean) => {
    goBottomButtonOnBottomChange(bottom);
    scrollLockRef.current.end = bottom;
  };

  return (
    <div className={className} ref={wrapperRef}>
      <ChatListDndContext
        active={active}
        myId={me?.user.id}
        onDragCancel={handleDragCancel}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollerRefContext.Provider value={scrollerRef}>
          <SortableContext items={chatList} strategy={verticalListSortingStrategy}>
            <ChatContentVirtualList
              firstItemIndex={firstItemIndex}
              renderRangeRef={renderRangeRef}
              filteredMessagesCount={filteredMessagesCount}
              virtuosoRef={virtuosoRef}
              scrollerRef={scrollerRef}
              chatList={chatList}
              handleBottomStateChange={handleBottomStateChange}
              me={me}
              myMember={myMember}
            />
            {showButton && <GoButtomButton onClick={goBottom} />}
          </SortableContext>
        </ScrollerRefContext.Provider>
      </ChatListDndContext>
    </div>
  );
};

export default ChatContentView;
