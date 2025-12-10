import { get } from '@boluo/api-browser';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { type RefObject, useEffect, useRef } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { type ChannelAtoms, useChannelAtoms } from './useChannelAtoms';
import { chatAtom } from '../state/chat.atoms';
import { findMessage } from '../state/channel.reducer';
import { type ChatItem } from '../state/channel.types';
import { head } from 'list';
import { useSetBanner } from './useBanner';

const LOAD_MESSAGE_LIMIT = 51;
const HIGHLIGHT_DURATION = 3000;

interface UseScrollToMessageParams {
  channelId: string;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  chatList: ChatItem[];
}

interface UseScrollToMessageReturn {
  isLoadingForScroll: boolean;
}

export const useScrollToMessage = ({
  channelId,
  virtuosoRef,
  chatList,
}: UseScrollToMessageParams): UseScrollToMessageReturn => {
  const store = useStore();
  const setBanner = useSetBanner();
  const { scrollToMessageAtom, highlightMessageAtom, filterAtom, showArchivedAtom }: ChannelAtoms =
    useChannelAtoms();

  const scrollToMessage = useAtomValue(scrollToMessageAtom);
  const setScrollToMessage = useSetAtom(scrollToMessageAtom);
  const setHighlightMessage = useSetAtom(highlightMessageAtom);
  const setFilter = useSetAtom(filterAtom);
  const setShowArchived = useSetAtom(showArchivedAtom);
  const dispatch = useSetAtom(chatAtom);

  const isLoadingRef = useRef(false);
  const highlightTimeoutRef = useRef<number | undefined>(undefined);
  const retryAttemptsRef = useRef(0);
  const retryTimeoutRef = useRef<number[]>([]);

  // Clear filters if target message is outside current filters
  useEffect(() => {
    if (scrollToMessage == null) return;

    const { inGame, archived } = scrollToMessage;
    setFilter((prevFilter) => {
      if (
        prevFilter === 'ALL' ||
        (inGame && prevFilter === 'IN_GAME') ||
        (!inGame && prevFilter === 'OOC')
      ) {
        return prevFilter;
      }
      return 'ALL';
    });
    if (archived) setShowArchived(true);
  }, [scrollToMessage, setFilter, setShowArchived]);

  // Use ref to avoid stale closure in the effect
  const chatListRef = useRef(chatList);
  chatListRef.current = chatList;

  // Handle scrolling to message
  useEffect(() => {
    if (scrollToMessage == null) return;

    const { messageId, pos } = scrollToMessage;
    retryAttemptsRef.current = 0;
    const clearRetryTimeouts = () => {
      retryTimeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      retryTimeoutRef.current = [];
    };
    clearRetryTimeouts();

    const scheduleRetry = (delay: number, replace = true) => {
      if (replace) {
        clearRetryTimeouts();
      }
      const timeoutId = window.setTimeout(() => {
        const currentScrollRequest = store.get(scrollToMessageAtom);
        if (currentScrollRequest?.messageId === messageId) {
          tryScrollToMessage();
        }
      }, delay);
      retryTimeoutRef.current.push(timeoutId);
    };

    const tryScrollToMessage = () => {
      // Find message in current chat list (use ref to get latest value)
      const currentChatList = chatListRef.current;

      if (currentChatList.length === 0) {
        return;
      }

      const chatState = store.get(chatAtom);
      const channelState = chatState.channels[channelId];
      if (!channelState) {
        setScrollToMessage(null);
        return;
      }

      // Find the message in chatList
      // Skip find if "pos" is small than first item pos
      const topPos = currentChatList[0]!.pos;
      if (pos >= topPos) {
        const chatListIndex = currentChatList.findIndex(
          (item) => item.type === 'MESSAGE' && item.id === messageId,
        );

        if (chatListIndex !== -1) {
          virtuosoRef.current?.scrollToIndex({
            index: chatListIndex,
            align: 'center',
            behavior: 'smooth',
          });

          // Set highlight
          window.clearTimeout(highlightTimeoutRef.current);
          setHighlightMessage(messageId);
          highlightTimeoutRef.current = window.setTimeout(() => {
            setHighlightMessage(null);
          }, HIGHLIGHT_DURATION);

          // Clear the scroll request
          setScrollToMessage(null);
          isLoadingRef.current = false;
          retryAttemptsRef.current = 0;
          clearRetryTimeouts();
          return;
        }

        if (retryAttemptsRef.current < 2) {
          const retryDelay = retryAttemptsRef.current === 0 ? 50 : 500;
          retryAttemptsRef.current += 1;
          scheduleRetry(retryDelay);
          return;
        }

        setBanner({
          level: 'WARNING',
          content: 'The message you are looking for is no longer available.',
        });
        setScrollToMessage(null);
        isLoadingRef.current = false;
        retryAttemptsRef.current = 0;
        clearRetryTimeouts();
        return;
      }

      if (channelState.fullLoaded) {
        setBanner({
          level: 'WARNING',
          content: 'The message you are looking for is no longer available.',
        });
        setScrollToMessage(null);
        isLoadingRef.current = false;
        return;
      }

      // Message not loaded, need to load more
      void loadMoreMessages();
    };

    const loadMoreMessages = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      const chatState = store.get(chatAtom);
      const channelState = chatState.channels[channelId];
      const before: number | null = channelState
        ? (head(channelState.messages)?.pos ?? null)
        : null;

      try {
        const result = await get('/messages/by_channel', {
          channelId,
          before,
          limit: LOAD_MESSAGE_LIMIT,
        });

        if (result.isErr) {
          console.error('Failed to load messages:', result.err);
          setScrollToMessage(null);
          isLoadingRef.current = false;
          return;
        }

        const newMessages = result.some;
        dispatch({
          type: 'messagesLoaded',
          payload: {
            before,
            channelId,
            messages: newMessages,
            fullLoaded: newMessages.length < LOAD_MESSAGE_LIMIT,
          },
        });

        isLoadingRef.current = false;

        // Schedule next attempt after state updates
        scheduleRetry(50);
        scheduleRetry(500, false);
      } catch (error) {
        setBanner({
          level: 'ERROR',
          content: 'An error occurred while loading messages.',
        });
        setScrollToMessage(null);
        isLoadingRef.current = false;
      }
    };

    tryScrollToMessage();

    return () => {
      clearRetryTimeouts();
    };
  }, [
    channelId,
    dispatch,
    scrollToMessage,
    scrollToMessageAtom,
    setBanner,
    setHighlightMessage,
    setScrollToMessage,
    store,
    virtuosoRef,
  ]);

  // Cleanup highlight timeout on unmount
  useEffect(() => {
    return () => {
      window.clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  return {
    isLoadingForScroll: isLoadingRef.current,
  };
};
