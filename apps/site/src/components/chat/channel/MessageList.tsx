import { DataRef, DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Message } from 'api';
import { ChevronsDown } from 'icons';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import type { FC, ReactNode } from 'react';
import { Suspense } from 'react';
import React, { useMemo } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';
import useSWRImmutable from 'swr/immutable';
import { Button, Loading } from 'ui';
import { unwrap } from 'utils';
import { get } from '../../../api/browser';
import { useChannelId } from '../../../hooks/useChannelId';
import type { ChannelState } from '../../../state/channel';
import { makeInitialChannelState } from '../../../state/channel';
import type { ChatState } from '../../../state/chat';
import { chatAtom, useDispatch } from '../../../state/chat';
import { MessageListItem } from './MessageListItem';

interface Props {
  className: string;
}

interface ViewProps {
  messages: Message[];
  className?: string;
}

const START_INDEX = Number.MAX_SAFE_INTEGER - 10000000;
const SHOW_BOTTOM_BUTTON_TIMEOUT = 500;
const LOAD_MESSAGE_LIMIT = 51;

const MessagesListLoading = () => {
  return (
    <div className="w-full h-full">
      <Loading />
    </div>
  );
};

export const MessageListHeader: FC = () => {
  const isFullLoaded = useIsFullLoaded();
  return (
    <div className="h-12 flex items-center justify-center select-none not-sr-only text-surface-300">
      {isFullLoaded ? 'Ω' : '...'}
    </div>
  );
};

const useMessages = (): Message[] | undefined => {
  const channelId = useChannelId();
  const maybeMessagesAtom = useMemo(
    () => selectAtom(chatAtom, chat => getChannel(chat, channelId)?.messages),
    [channelId],
  );
  return useAtomValue(maybeMessagesAtom);
};

const useIsFullLoaded = (): boolean => {
  const channelId = useChannelId();
  const isFullLoadAtom = useMemo(
    () => selectAtom(chatAtom, chat => getChannel(chat, channelId)?.fullLoaded),
    [channelId],
  );
  return useAtomValue(isFullLoadAtom) || false;
};

const fetchNewMessage = (channelId: string, before: number | null = null): Promise<Message[]> => {
  return get('/messages/by_channel', { channelId, before, limit: LOAD_MESSAGE_LIMIT }).then(unwrap);
};

const useInitialMessages = (messageCount: number) => {
  const isFullLoaded = useIsFullLoaded();
  const channelId = useChannelId();
  const dispatch = useDispatch();
  const shouldFetch = messageCount === 0 && !isFullLoaded;
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

const useLoadMore = (before: number | null, onNewMessage: OnNewMessage) => {
  const channelId = useChannelId();
  const dispatch = useDispatch();
  return useCallback(async () => {
    const newMessages = await fetchNewMessage(channelId, before);
    dispatch('messagesLoaded', {
      before,
      channelId,
      messages: newMessages,
      fullLoaded: newMessages.length < LOAD_MESSAGE_LIMIT,
    });
    onNewMessage(newMessages);
  }, [before, channelId, dispatch, onNewMessage]);
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

const MessageListView: FC<ViewProps> = ({ className = '', messages }) => {
  const isFullLoaded = useIsFullLoaded();
  const messagesCount = messages.length;
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  useInitialMessages(messagesCount);
  const { showButton, handleBottomStateChange } = useScrollToBottom();

  const onNewMessage = useCallback(
    (newMessages: Message[]) => setFirstItemIndex(prevIndex => prevIndex - newMessages.length),
    [],
  );
  const loadMore = useLoadMore(messages[0]?.pos ?? null, onNewMessage);

  const [active, setActive] = useState<[number, Message] | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data as DataRef<SortableData>;
    if (!data.current) return;
    const { message, sortable } = data.current;
    setActive([sortable.index, message]);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    console.log(event);
    setActive(null);
  };

  return (
    <div className={className}>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={messages} strategy={verticalListSortingStrategy}>
          <Virtuoso
            firstItemIndex={firstItemIndex}
            ref={virtuosoRef}
            components={{ Header: MessageListHeader }}
            initialTopMostItemIndex={messagesCount - 1}
            data={messages}
            totalCount={messagesCount}
            startReached={isFullLoaded ? undefined : loadMore}
            followOutput="auto"
            itemContent={(virtualIndex, message) => {
              return <MessageListItem message={message} className="py-2 px-4" />;
            }}
            atBottomStateChange={handleBottomStateChange}
          />
          {showButton && (
            <Button
              onClick={() => virtuosoRef.current!.scrollToIndex({ index: messagesCount - 1, behavior: 'smooth' })}
              className="absolute right-6 bottom-4 text-lg"
            >
              <ChevronsDown />
            </Button>
          )}
        </SortableContext>
        <DragOverlay>
          {active && <MessageListItem message={active[1]} className="py-2 px-4" />}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

const getChannel = (chatState: ChatState, channelId: string): ChannelState | undefined => {
  if (chatState.type !== 'SPACE' || !chatState.context.initialized) return undefined;
  return chatState.channels[channelId] ?? makeInitialChannelState(channelId);
};

export const MessageList: FC<Props> = ({ className }) => {
  const messages = useMessages();
  const loading = <MessagesListLoading />;
  if (!messages) return loading;
  return (
    <Suspense fallback={loading}>
      <MessageListView className={className} messages={messages} />
    </Suspense>
  );
};
