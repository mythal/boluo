import {
  closestCenter,
  DataRef,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Message } from 'api';
import { useGet, useMe, usePost } from 'common';
import { ChevronsDown } from 'icons';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import type { Dispatch, FC, SetStateAction } from 'react';
import { Suspense } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';
import useSWRImmutable from 'swr/immutable';
import { Button, Loading } from 'ui';
import { unwrap } from 'utils';
import { useChannelId } from '../../hooks/useChannelId';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { chatAtom, useChatDispatch } from '../../state/atoms/chat';
import { chatListAtomFamily } from '../../state/atoms/chat-list';
import type { ChannelState } from '../../state/channel';
import { makeInitialChannelState } from '../../state/channel';
import type { ChatSpaceState } from '../../state/chat';
import { ChatItem } from '../../types/chat-items';
import { ChatItemMessage } from './ChatItemMessage';
import { ChatItemSwitch } from './ChatItemSwitch';

interface Props {
  className: string;
}

interface ViewProps {
  chatList: ChatItem[];
  className?: string;
}

const START_INDEX = Number.MAX_SAFE_INTEGER - 10000000;
const SHOW_BOTTOM_BUTTON_TIMEOUT = 500;
const LOAD_MESSAGE_LIMIT = 51;
const OPTIMISTIC_REORDER_TIMEOUT = 2000;

const ChatListLoading = () => {
  return (
    <div className="w-full h-full">
      <Loading />
    </div>
  );
};

export const ChatListHeader: FC = () => {
  const isFullLoaded = useIsFullLoaded();
  return (
    <div className="h-12 flex items-center justify-center select-none not-sr-only text-surface-300">
      {isFullLoaded ? 'Ω' : '...'}
    </div>
  );
};

const useChatList = (): ChatItem[] | undefined => {
  const channelId = useChannelId();
  return useAtomValue(useMemo(() => chatListAtomFamily(channelId), [channelId]))?.itemList;
};

const useIsFullLoaded = (): boolean => {
  const channelId = useChannelId();
  const isFullLoadAtom = useMemo(
    () => selectAtom(chatAtom, chat => getChannel(chat, channelId)?.fullLoaded),
    [channelId],
  );
  return useAtomValue(isFullLoadAtom) || false;
};

const useFetchNewMessage = () => {
  const get = useGet();
  return useCallback((channelId: string, before: number | null = null): Promise<Message[]> => {
    return get('/messages/by_channel', { channelId, before, limit: LOAD_MESSAGE_LIMIT }).then(unwrap);
  }, [get]);
};

const useInitialMessages = (messageCount: number) => {
  const isFullLoaded = useIsFullLoaded();
  const channelId = useChannelId();
  const dispatch = useChatDispatch();
  const shouldFetch = messageCount === 0 && !isFullLoaded;
  const fetchNewMessage = useFetchNewMessage();
  return useSWRImmutable(
    shouldFetch ? ['/messages/by_channel', channelId] : null,
    async () => await fetchNewMessage(channelId),
    {
      onSuccess: (newMessages) => {
        dispatch('messagesLoaded', {
          before: null,
          channelId,
          messages: newMessages,
          fullLoaded: newMessages.length < LOAD_MESSAGE_LIMIT,
        });
      },
    },
  );
};

type OnNewMessage = (newMessages: Message[]) => void;

const useLoadMore = (chatList: ChatItem[], onNewMessage: OnNewMessage) => {
  const channelId = useChannelId();
  const dispatch = useChatDispatch();
  const before: number | null = useMemo(() => {
    for (const item of chatList) {
      if (item.type === 'MESSAGE') {
        return item.pos;
      }
    }
    return null;
  }, [chatList]);
  const fetchNewMessage = useFetchNewMessage();
  return useCallback(async () => {
    const newMessages = await fetchNewMessage(channelId, before);
    dispatch('messagesLoaded', {
      before,
      channelId,
      messages: newMessages,
      fullLoaded: newMessages.length < LOAD_MESSAGE_LIMIT,
    });
    onNewMessage(newMessages);
  }, [before, channelId, dispatch, fetchNewMessage, onNewMessage]);
};

interface UseScrollToBottom {
  showButton: boolean;
  handleBottomStateChange: (bottom: boolean) => void;
}

const useScrollToBottom = (): UseScrollToBottom => {
  // ref: https://virtuoso.dev/stick-to-bottom/
  const [showButton, setShowButton] = useState(false);
  const showButtonTimeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(showButtonTimeoutRef.current));
  const handleBottomStateChange = useCallback((bottom: boolean) => {
    window.clearTimeout(showButtonTimeoutRef.current);
    if (bottom) {
      setShowButton(false);
    } else {
      showButtonTimeoutRef.current = window.setTimeout(() => setShowButton(true), SHOW_BOTTOM_BUTTON_TIMEOUT);
    }
  }, []);
  return { showButton, handleBottomStateChange };
};

interface SortableData {
  message: Message;
  sortable: {
    index: number;
  };
}

interface OptimisticItem {
  realIndex: number;
  optimisticIndex: number;
  message: Message;
}

type SetOptimisticReorder = Dispatch<SetStateAction<OptimisticItem | null>>;

interface UseOptimisticReorderResult {
  optimisticReorder: OptimisticItem | null;
  optimisticChatList: ChatItem[];
  setOptimisticReorder: SetOptimisticReorder;
}

const useOptimisticReorder = (chatList: ChatItem[]): UseOptimisticReorderResult => {
  const [optimisticReorder, setOptimisticReorder] = useState<OptimisticItem | null>(null);

  // Reset the optimistic reorder when messages changed
  if (optimisticReorder !== null) {
    const item = chatList[optimisticReorder.realIndex];
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
    if (optimisticReorder === null) return chatList;
    const { realIndex, optimisticIndex } = optimisticReorder;
    if (realIndex === optimisticIndex) return chatList;
    const newMessages = [...chatList];
    const message = newMessages.splice(realIndex, 1)[0]!;
    newMessages.splice(optimisticIndex, 0, message);
    return newMessages;
  }, [optimisticReorder, chatList]);

  return { optimisticChatList, optimisticReorder, setOptimisticReorder };
};

interface UseDragHandlesResult {
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  active: [number, Message] | null;
  clearActive: () => void;
}

const useDragHandles = (chatList: ChatItem[], setOptimisticReorder: SetOptimisticReorder): UseDragHandlesResult => {
  const channelId = useChannelId();
  const [active, setActive] = useState<[number, Message] | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data as DataRef<SortableData>;
    if (!data.current) return;
    const { message, sortable } = data.current;
    setActive([sortable.index, message]);
    setOptimisticReorder(null);
  }, [setOptimisticReorder]);
  const clearActive = useCallback(() => setActive(null), []);
  const post = usePost();

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const messagesCount = chatList.length;
    if (active === null) return;
    clearActive();
    if (messagesCount < 2 || !event.over) {
      return;
    }
    const overData = event.over.data as DataRef<SortableData>;
    if (!overData.current) return;
    const { sortable } = overData.current;
    const [realIndex, message] = active;
    const targetIndex = sortable.index;
    if (realIndex === targetIndex) return;
    clearActive();
    setOptimisticReorder({
      message,
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
        messageId: message.id,
        range,
      });
      if (result.isErr) {
        // TODO: handle error
      }
    }
    setOptimisticReorder(null);
  }, [chatList, active, clearActive, setOptimisticReorder, post, channelId]);

  return { handleDragStart, handleDragEnd, active, clearActive };
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

const MessageListView: FC<ViewProps> = ({ className = '', chatList }) => {
  const me = useMe();
  const isFullLoaded = useIsFullLoaded();
  const dispatch = useChatDispatch();
  const channelId = useChannelId();
  const totalCount = chatList.length;
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor);
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(
    mouseSensor,
    touchSensor,
    keyboardSensor,
  );
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  useInitialMessages(totalCount);
  const { showButton, handleBottomStateChange } = useScrollToBottom();

  const { optimisticChatList, optimisticReorder, setOptimisticReorder } = useOptimisticReorder(chatList);
  const onNewMessage = useCallback(
    (newMessages: Message[]) => {
      setFirstItemIndex(prevIndex => prevIndex - newMessages.length);
      setOptimisticReorder(null);
    },
    [setOptimisticReorder],
  );
  const loadMore = useLoadMore(chatList, onNewMessage);
  const member = useMyChannelMember(channelId);

  const { handleDragStart, handleDragEnd, active, clearActive } = useDragHandles(chatList, setOptimisticReorder);
  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragCancel={clearActive}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={optimisticChatList} strategy={verticalListSortingStrategy}>
          <Virtuoso
            firstItemIndex={firstItemIndex}
            ref={virtuosoRef}
            components={{ Header: ChatListHeader }}
            initialTopMostItemIndex={totalCount - 1}
            data={optimisticChatList}
            totalCount={totalCount}
            startReached={isFullLoaded ? undefined : loadMore}
            followOutput="auto"
            itemContent={(virtualIndex, chatItem) => {
              const realIndex = virtualIndex - firstItemIndex;
              if (optimisticReorder?.optimisticIndex === realIndex) {
                const { message } = optimisticReorder;
                return <ChatItemMessage message={message} key={message.id} self />;
              }
              return (
                <ChatItemSwitch
                  key={chatItem.key}
                  myId={me?.user.id}
                  chatItem={chatItem}
                  isMember={member !== null}
                  isContinuous={isContinuous(optimisticChatList[realIndex - 1], chatItem)}
                />
              );
            }}
            atBottomStateChange={(bottom) => {
              handleBottomStateChange(bottom);
              if (bottom) {
                dispatch('reachBottom', { channelId });
              }
            }}
          />
          {showButton && (
            <Button
              onClick={() => virtuosoRef.current!.scrollToIndex({ index: totalCount - 1, behavior: 'smooth' })}
              className="absolute right-6 bottom-4 text-lg"
            >
              <ChevronsDown />
            </Button>
          )}
        </SortableContext>
        {createPortal(
          <DragOverlay zIndex={15}>
            {active && <ChatItemMessage message={active[1]} className="py-2 px-4" self />}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  );
};

const getChannel = (chatState: ChatSpaceState, channelId: string): ChannelState | undefined => {
  if (chatState.type !== 'SPACE' || !chatState.context.initialized) return undefined;
  return chatState.channels[channelId] ?? makeInitialChannelState(channelId);
};

export const ChatList: FC<Props> = ({ className }) => {
  const chatList = useChatList();
  const loading = <ChatListLoading />;
  if (chatList === undefined) return loading;
  return (
    <Suspense fallback={loading}>
      <MessageListView className={className} chatList={chatList} />
    </Suspense>
  );
};
