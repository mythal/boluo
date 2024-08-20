import { type DataRef, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import type { FC, MutableRefObject, RefObject } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import type { VirtuosoHandle } from 'react-virtuoso';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { type SetOptimisticItems, useChatList } from '../../hooks/useChatList';
import { ScrollerRefContext } from '../../hooks/useScrollerRef';
import { type ChatItem, type MessageItem } from '../../state/channel.types';
import { chatAtom } from '../../state/chat.atoms';
import { ChatListDndContext } from './ChatContentDndContext';
import { ChatContentVirtualList } from './ChatContentVirtualList';
import { GoButtomButton } from './GoBottomButton';
import { channelReadFamily } from '../../state/unread.atoms';
import { ReadObserverContext } from '../../hooks/useReadObserve';
import { useMember } from '../../hooks/useMember';
import { recordWarn } from '../../error';

interface Props {
  setIsScrolling: (isScrolling: boolean) => void;
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
    virtuoso.scrollToIndex({ index: 'LAST' });
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
  const setBanner = useSetBanner();
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

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
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
        setBanner({
          level: 'WARNING',
          content: (
            <FormattedMessage defaultMessage="Failed to move the message, the target is lost. Please try again." />
          ),
        });
        recordWarn('Lost the target item when drag end');
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
        setOptimisticItems((items) => {
          const nextItems = { ...items };
          delete nextItems[draggingMessage.id];
          return nextItems;
        });
        if (result.isErr) {
          const errorCode = result.err.code;
          setBanner({
            level: 'ERROR',
            content: <FormattedMessage defaultMessage="Failed to move message ({errorCode})" values={{ errorCode }} />,
          });
        }
      }
    },
    [resetDragging, setOptimisticItems, channelId, setBanner],
  );

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

const useScrollLock = (
  virtuosoRef: RefObject<VirtuosoHandle | null>,
  scrollerRef: RefObject<HTMLDivElement | null>,
  wrapperRef: RefObject<HTMLDivElement | null>,
  rangeRef: MutableRefObject<[number, number]>,
  chatList: ChatItem[],
): MutableRefObject<ScrollLockState> => {
  const scrollLockRef = useRef<ScrollLockState>({ end: true, id: null, modified: 0 });
  const prevChatListLength = useRef(chatList.length);

  useEffect(() => {
    if (chatList.length !== prevChatListLength.current) {
      const virtuoso = virtuosoRef.current;
      if (!virtuoso || !scrollLockRef.current.end) return;
      virtuoso.scrollToIndex({ index: 'LAST' });
    }
    prevChatListLength.current = chatList.length;
  });
  return scrollLockRef;
};

export const ChatContentView: FC<Props> = ({ setIsScrolling }) => {
  const channelId = useChannelId();
  const store = useStore();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const myMember = useMember();

  const myId: string | undefined = myMember?.user.id;
  const { showButton, onBottomStateChange: goBottomButtonOnBottomChange, goBottom } = useScrollToBottom(virtuosoRef);
  const { chatList, setOptimisticItems, firstItemIndex, filteredMessagesCount, scheduledGcLowerPos } = useChatList(
    channelId,
    myId,
  );

  const { handleDragStart, handleDragEnd, active, handleDragCancel } = useDndHandles(
    channelId,
    chatList,
    setOptimisticItems,
  );
  const renderRangeRef = useRef<[number, number]>([0, 0]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const positionObserverRef = useRef<IntersectionObserver | null>(null);
  const scrollLockRef = useScrollLock(virtuosoRef, scrollerRef, wrapperRef, renderRangeRef, chatList);

  type UnregisterOberver = () => void;

  const readObserve = useCallback(
    (node: Element): UnregisterOberver => {
      // Create the observer if not exists
      if (positionObserverRef.current === null) {
        const scroller = scrollerRef.current;
        if (!scroller) {
          console.debug("The scroller doesn't exist yet");
          return () => {};
        }
        positionObserverRef.current = new IntersectionObserver(
          (entries) => {
            // Update the bottom state
            for (const entry of entries) {
              if (entry.target.getAttribute('data-is-last') === 'true') {
                if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
                  scrollLockRef.current.end = true;
                  goBottomButtonOnBottomChange(true);
                }
                if (!entry.isIntersecting && entry.intersectionRatio < 0.1) {
                  scrollLockRef.current.end = false;
                  goBottomButtonOnBottomChange(false);
                }
              }
            }
            // Update the read position record
            window.setTimeout(() => {
              let maxPos = Number.MIN_SAFE_INTEGER;
              for (const entry of entries) {
                if (entry.intersectionRatio > 0.7 && entry.isIntersecting) {
                  const rawPos = entry.target.getAttribute('data-read-position');
                  if (!rawPos) continue;
                  const pos = parseFloat(rawPos);
                  if (Number.isNaN(pos)) {
                    recordWarn(`Invalid read position: ${rawPos}`);
                    continue;
                  }
                  maxPos = Math.max(maxPos, pos);
                }
              }
              const prevReadPos = store.get(channelReadFamily(channelId));
              if (maxPos > prevReadPos) {
                store.set(channelReadFamily(channelId), maxPos);
              }
            }, 30);
          },
          { root: scroller, threshold: [0, 0.8] },
        );
      }
      positionObserverRef.current.observe(node);
      return () => {
        positionObserverRef.current?.unobserve(node);
      };
    },
    [channelId, goBottomButtonOnBottomChange, scrollLockRef, store],
  );

  useEffect(() => {
    if (scheduledGcLowerPos === null) return;
    const [a] = renderRangeRef.current;
    const chatItem = chatList[a];
    if (chatItem && scheduledGcLowerPos > chatItem.pos) {
      console.debug(`[Messages GC] Reset GC. scheduled: ${scheduledGcLowerPos} reset: ${chatItem.pos}`);
      store.set(chatAtom, { type: 'resetGc', payload: { pos: chatItem.pos } });
    }
  });

  return (
    <div className="@container relative" ref={wrapperRef}>
      <ScrollerRefContext.Provider value={scrollerRef}>
        <ReadObserverContext.Provider value={readObserve}>
          <ChatListDndContext
            active={active}
            onDragCancel={handleDragCancel}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={chatList} strategy={verticalListSortingStrategy}>
              <ChatContentVirtualList
                firstItemIndex={firstItemIndex}
                setIsScrolling={setIsScrolling}
                renderRangeRef={renderRangeRef}
                filteredMessagesCount={filteredMessagesCount}
                virtuosoRef={virtuosoRef}
                scrollerRef={scrollerRef}
                chatList={chatList}
              />
              {showButton && <GoButtomButton channelId={channelId} chatList={chatList} onClick={goBottom} />}
            </SortableContext>
          </ChatListDndContext>
        </ReadObserverContext.Provider>
      </ScrollerRefContext.Provider>
    </div>
  );
};

export default ChatContentView;
