import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { type RefObject, useEffect, useEffectEvent, useRef } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { type ChannelAtoms, useChannelAtoms } from './useChannelAtoms';
import { chatAtom } from '../state/chat.atoms';
import { type ChatItem } from '../state/channel.types';
import { head } from 'list';
import { useSetBanner } from './useBanner';
import { recordWarn } from '../error';
import { loadChannelMessages } from '../state/loadChannelMessages';
import { isChannelHistoryFull, isChannelHistoryInitialized } from '../state/channel.reducer';

const LOAD_MESSAGE_LIMIT = 51;
const HIGHLIGHT_DURATION = 3000;

interface UseScrollToMessageParams {
  channelId: string;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  chatList: ChatItem[];
}

export const useScrollToMessage = ({
  channelId,
  virtuosoRef,
  chatList,
}: UseScrollToMessageParams): void => {
  const store = useStore();
  const setBanner = useSetBanner();
  const { scrollToMessageAtom, highlightMessageAtom, filterAtom, showArchivedAtom }: ChannelAtoms =
    useChannelAtoms();

  const scrollToMessage = useAtomValue(scrollToMessageAtom);
  const setScrollToMessage = useSetAtom(scrollToMessageAtom);
  const setHighlightMessage = useSetAtom(highlightMessageAtom);
  const setFilter = useSetAtom(filterAtom);
  const setShowArchived = useSetAtom(showArchivedAtom);

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

  const getLatestChatList = useEffectEvent(() => chatList);

  // Handle scrolling to message
  useEffect(() => {
    if (scrollToMessage == null) return;

    const { messageId, pos } = scrollToMessage;
    let active = true;
    const isCurrentRequest = () => active && store.get(scrollToMessageAtom) === scrollToMessage;
    retryAttemptsRef.current = 0;
    const clearRetryTimeouts = () => {
      retryTimeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      retryTimeoutRef.current = [];
    };
    clearRetryTimeouts();

    const scheduleRetry = (delay: number, replace = true) => {
      if (!isCurrentRequest()) return;
      if (replace) {
        clearRetryTimeouts();
      }
      const timeoutId = window.setTimeout(() => {
        if (isCurrentRequest()) {
          tryScrollToMessage();
        }
      }, delay);
      retryTimeoutRef.current.push(timeoutId);
    };

    const tryScrollToMessage = () => {
      const currentChatList = getLatestChatList();

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
          const virtuoso = virtuosoRef.current;
          if (!virtuoso) {
            scheduleRetry(50);
            return;
          }
          retryAttemptsRef.current = 0;
          clearRetryTimeouts();
          virtuoso.scrollIntoView({
            index: chatListIndex,
            align: 'center',
            behavior: 'smooth',
            // Preserve centering even when the target is already visible.
            calculateViewLocation: ({ locationParams }) => locationParams,
            done: () => {
              // Retain GC protection during scrolling; an old completion must not clear a new request.
              if (isCurrentRequest()) setScrollToMessage(null);
            },
          });

          // Set highlight
          window.clearTimeout(highlightTimeoutRef.current);
          setHighlightMessage(messageId);
          highlightTimeoutRef.current = window.setTimeout(() => {
            setHighlightMessage(null);
          }, HIGHLIGHT_DURATION);

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
        retryAttemptsRef.current = 0;
        clearRetryTimeouts();
        return;
      }

      if (isChannelHistoryFull(channelState)) {
        setBanner({
          level: 'WARNING',
          content: 'The message you are looking for is no longer available.',
        });
        setScrollToMessage(null);
        return;
      }

      // Message not loaded, need to load more
      void loadMoreMessages();
    };

    const loadMoreMessages = async () => {
      if (isLoadingRef.current) {
        scheduleRetry(50);
        return;
      }

      const chatState = store.get(chatAtom);
      const channelState = chatState.channels[channelId];
      if (channelState?.historyState === 'INITIAL_LOADING') {
        scheduleRetry(500);
        return;
      }
      const before: number | null = channelState
        ? (head(channelState.messages.ordered)?.pos ?? null)
        : null;

      isLoadingRef.current = true;
      try {
        const baseOptions = {
          channelId,
          limit: LOAD_MESSAGE_LIMIT,
        };
        const shouldLoadInitialHistory =
          channelState == null || !isChannelHistoryInitialized(channelState) || before == null;
        const { result } = await loadChannelMessages(
          shouldLoadInitialHistory
            ? { ...baseOptions, mode: 'INITIAL' }
            : { ...baseOptions, before, mode: 'LOAD_MORE' },
        );
        if (!isCurrentRequest()) return;

        if (result.isErr) {
          recordWarn('Failed to load messages while scrolling', {
            channelId,
            error: result.err,
          });
          setScrollToMessage(null);
          return;
        }

        // Schedule next attempt after state updates
        scheduleRetry(50);
        scheduleRetry(500, false);
      } catch (error) {
        if (!isCurrentRequest()) return;
        setBanner({
          level: 'ERROR',
          content: 'An error occurred while loading messages.',
        });
        setScrollToMessage(null);
      } finally {
        // Only the load that acquired this flag may release it, even if its jump was replaced.
        isLoadingRef.current = false;
      }
    };

    tryScrollToMessage();

    return () => {
      active = false;
      clearRetryTimeouts();
    };
  }, [
    channelId,
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
};
