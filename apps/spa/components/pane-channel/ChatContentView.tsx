import { type DataRef, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { post } from '@boluo/api-browser';
import { useSetAtom, useStore } from 'jotai';
import type { FC, RefObject } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import type { VirtuosoHandle } from 'react-virtuoso';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { isDummySelfPreview, useChatList } from '../../hooks/useChatList';
import { ScrollerRefContext } from '../../hooks/useScrollerRef';
import { VirtuosoRefContext } from '../../hooks/useVirtuosoRef';
import { type ChatItem, type MessageItem } from '../../state/channel.types';
import { chatAtom } from '../../state/chat.atoms';
import { ChatListDndContext } from './ChatContentDndContext';
import { ChatContentVirtualList } from './ChatContentVirtualList';
import { GoBottomButton } from './GoBottomButton';
import { channelReadFamily } from '../../state/unread.atoms';
import { ReadObserverContext } from '../../hooks/useReadObserve';
import { useMember } from '../../hooks/useMember';
import { recordWarn } from '../../error';
import { timeout } from '@boluo/utils/async';
import { useScrollToMessage } from '../../hooks/useScrollToMessage';
import { ImagePreviewProvider } from './ImagePreviewOverlay';
import { ChatContentContainer } from './ChatContentContainer';

interface Props {
  setIsScrolling: (isScrolling: boolean) => void;
  currentUserId?: string | undefined | null;
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
      showButtonTimeoutRef.current = window.setTimeout(
        () => setShowButton(true),
        SHOW_BOTTOM_BUTTON_TIMEOUT,
      );
    }
  }, []);

  const goBottom = useCallback(() => {
    const virtuoso = virtuosoRef.current;
    if (!virtuoso) return;
    virtuoso.scrollToIndex({ index: 'LAST' });
    setShowButton(false);
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

const useDndHandles = (channelId: string, chatList: ChatItem[]): UseDragHandlesResult => {
  const setBanner = useSetBanner();
  const dispatch = useSetAtom(chatAtom);
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
      if (active == null) return;
      resetDragging();
      if (messagesCount < 2) return;
      if (!event.over) return;
      const overData = event.over.data as DataRef<SortableData>;
      if (!overData.current) return;
      const { sortable } = overData.current;
      const { message: draggingMessage } = active;
      const targetIndex = Math.min(messagesCount - 1, sortable.index);
      const sourceIndex = chatList.findIndex(
        (chatItem) => chatItem.type === 'MESSAGE' && chatItem.id === draggingMessage.id,
      );
      if (sourceIndex === -1) {
        setBanner({
          level: 'WARNING',
          content: (
            <FormattedMessage defaultMessage="The message you are trying to move is no longer available." />
          ),
        });
        return;
      }
      if (sourceIndex === targetIndex) return;
      const targetItem = chatList[targetIndex];
      if (!targetItem) {
        setBanner({
          level: 'WARNING',
          content: (
            <FormattedMessage defaultMessage="The position you are trying to place the message is changed." />
          ),
        });
        return;
      }
      const timestamp = Date.now();
      const item: MessageItem = { ...draggingMessage, optimistic: true };
      let range: [[number, number] | null, [number, number] | null] | null = null;
      if (sourceIndex < targetIndex) {
        range = [[targetItem.posP, targetItem.posQ], null];
        const targetNext = chatList[targetIndex + 1];
        if (!targetNext) {
          if (targetItem.type === 'PREVIEW' && isDummySelfPreview(targetItem)) {
            // Dummy preview at the end
            const targetBefore = chatList[targetIndex - 1];
            if (!targetBefore) return;
            range = [[targetBefore.posP, targetBefore.posQ], null];
          }
          // Move to the end
        } else if (
          targetItem.type === 'PREVIEW' ||
          (targetNext.type === 'PREVIEW' && !isDummySelfPreview(targetNext))
        ) {
          range = [
            [targetItem.posP, targetItem.posQ],
            [targetNext.posP, targetNext.posQ],
          ];
        }
        const optimisticPos = targetNext
          ? (targetNext.pos + targetItem.pos) / 2
          : (targetItem.posP + 1) / targetItem.posQ;
        dispatch({
          type: 'setOptimisticMessage',
          payload: { ref: draggingMessage, item: { optimisticPos, timestamp, item } },
        });
      } else {
        range = [null, [targetItem.posP, targetItem.posQ]];

        const targetBefore = chatList[targetIndex - 1];
        if (!targetBefore) {
          // Move to the beginning
        } else if (targetItem.type === 'PREVIEW' || targetBefore.type === 'PREVIEW') {
          range = [
            [targetBefore.posP, targetBefore.posQ],
            [targetItem.posP, targetItem.posQ],
          ];
        }

        const optimisticPos = targetBefore
          ? (targetBefore.posP + targetItem.posP) / (targetBefore.posQ + targetItem.posQ)
          : targetItem.posP / (targetItem.posQ + 1);
        dispatch({
          type: 'setOptimisticMessage',
          payload: { ref: draggingMessage, item: { optimisticPos, timestamp, item } },
        });
      }
      if (range) {
        const result = await Promise.race([
          post('/messages/move_between', null, {
            channelId,
            messageId: draggingMessage.id,
            expectPos: [draggingMessage.posP, draggingMessage.posQ],
            range,
          }),
          timeout(8000),
        ]);
        dispatch({ type: 'removeOptimisticMessage', payload: { id: draggingMessage.id } });
        if (result === 'TIMEOUT' || result.isErr) {
          dispatch({
            type: 'fail',
            payload: { failTo: { type: 'MOVE' }, key: draggingMessage.id },
          });
        }
      }
    },
    [resetDragging, setBanner, dispatch, channelId],
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
  rangeRef: RefObject<[number, number]>,
  chatList: ChatItem[],
): RefObject<ScrollLockState> => {
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

export const ChatContentView: FC<Props> = ({ setIsScrolling, currentUserId }) => {
  const channelId = useChannelId();
  const store = useStore();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const myMember = useMember();

  const myId: string | undefined = myMember?.user.id;
  const {
    showButton,
    onBottomStateChange: goBottomButtonOnBottomChange,
    goBottom,
  } = useScrollToBottom(virtuosoRef);
  const { chatList, firstItemIndex, filteredMessagesCount, scheduledGcLowerPos } = useChatList(
    channelId,
    myId,
  );

  useScrollToMessage({
    channelId,
    virtuosoRef,
    chatList,
  });

  const { handleDragStart, handleDragEnd, active, handleDragCancel } = useDndHandles(
    channelId,
    chatList,
  );
  const renderRangeRef = useRef<[number, number]>([0, 0]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const positionObserverRef = useRef<IntersectionObserver | null>(null);
  const scrollLockRef = useScrollLock(
    virtuosoRef,
    scrollerRef,
    wrapperRef,
    renderRangeRef,
    chatList,
  );

  type UnregisterOberver = () => void;

  const readObserve = useCallback(
    (node: Element): UnregisterOberver => {
      // Create the observer if not exists
      if (positionObserverRef.current == null) {
        const scroller = scrollerRef.current;
        if (!scroller) {
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
    if (scheduledGcLowerPos == null) return;
    const [a] = renderRangeRef.current;
    const chatItem = chatList[a];
    if (chatItem && scheduledGcLowerPos > chatItem.pos) {
      console.debug(
        `[Messages GC] Reset GC. scheduled: ${scheduledGcLowerPos} reset: ${chatItem.pos}`,
      );
      store.set(chatAtom, { type: 'resetGc', payload: { pos: chatItem.pos } });
    }
  });

  return (
    <ChatContentContainer ref={wrapperRef}>
      <ImagePreviewProvider>
        <VirtuosoRefContext value={virtuosoRef}>
          <ScrollerRefContext value={scrollerRef}>
            <ReadObserverContext value={readObserve}>
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
                    currentUserId={currentUserId}
                  />
                  {showButton && (
                    <GoBottomButton channelId={channelId} chatList={chatList} onClick={goBottom} />
                  )}
                </SortableContext>
              </ChatListDndContext>
            </ReadObserverContext>
          </ScrollerRefContext>
        </VirtuosoRefContext>
      </ImagePreviewProvider>
    </ChatContentContainer>
  );
};

export default ChatContentView;
