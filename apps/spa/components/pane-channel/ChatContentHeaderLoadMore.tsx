import clsx from 'clsx';
import ChevronDown from '@boluo/icons/ChevronDown';
import CircleNotch from '@boluo/icons/CircleNotch';
import { useAtomValue, useStore } from 'jotai';
import { type FC, useEffect, useEffectEvent, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { useMountedRef } from '@boluo/hooks/useMounted';
import { chatAtom, isChatInitializedAtom } from '../../state/chat.atoms';
import { head } from 'list';
import { loadChannelMessages } from '../../state/loadChannelMessages';
import { isChannelHistoryInitialized } from '../../state/channel.reducer';

const LOAD_MESSAGE_LIMIT = 51;
const STALE_PAGE_RETRY_DELAY = 250;
const AUTO_LOAD = true;

interface Point {
  x: number;
  y: number;
}

const shouldTriggerLoad = (start: Point, end: Point) => {
  return end.y - start.y > 20;
};

export const ChatContentHeaderLoadMore: FC = () => {
  const channelId = useChannelId();
  const mountedRef = useMountedRef();
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const isLoadMoreVisibleRef = useRef(false);
  const stalePageRetryTimeoutRef = useRef<number | undefined>(undefined);
  const store = useStore();
  const chatInitialized = useAtomValue(isChatInitializedAtom);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const [touchState, setTouchState] = useState<'NONE' | 'START' | 'WILL_LOAD'>('NONE');
  const setBanner = useSetBanner();

  const loadMore = async () => {
    if (!chatInitialized || isLoadingRef.current || !mountedRef.current) return;
    window.clearTimeout(stalePageRetryTimeoutRef.current);
    stalePageRetryTimeoutRef.current = undefined;
    const chatState = store.get(chatAtom);
    const channelState = chatState.channels[channelId];
    if (channelState?.historyState === 'INITIAL_LOADING') return;

    isLoadingRef.current = true;
    setIsLoading(true);
    const before: number | null = channelState ? (head(channelState.messages)?.pos ?? null) : null;
    try {
      const baseOptions = {
        channelId,
        limit: LOAD_MESSAGE_LIMIT,
      };
      const shouldLoadInitialHistory =
        channelState == null || !isChannelHistoryInitialized(channelState) || before == null;
      const { result, status } = await loadChannelMessages(
        shouldLoadInitialHistory
          ? { ...baseOptions, mode: 'INITIAL' }
          : { ...baseOptions, before, mode: 'LOAD_MORE' },
      );
      if (result.isErr) {
        setBanner({
          level: 'ERROR',
          content: (
            <FormattedMessage
              defaultMessage="Failed to load messages ({errorCode})"
              values={{ errorCode: result.err.code }}
            />
          ),
        });
        return;
      }
      if (status === 'STALE_PAGE' && isLoadMoreVisibleRef.current) {
        stalePageRetryTimeoutRef.current = window.setTimeout(
          () => void loadMore(),
          STALE_PAGE_RETRY_DELAY,
        );
      }
    } finally {
      isLoadingRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const loadMoreFromEffect = useEffectEvent(() => {
    void loadMore();
  });
  useEffect(() => {
    let autoLoadTimeout: number | undefined;
    let isTouchDevice = false;
    let isVisible = false;
    let touchStartPoint: Point | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) return;
        const entry = entries[0]!;
        isVisible = entry.isIntersecting;
        isLoadMoreVisibleRef.current = entry.isIntersecting;
        window.clearTimeout(autoLoadTimeout);
        if (AUTO_LOAD && entry.isIntersecting && !isTouchDevice) {
          autoLoadTimeout = window.setTimeout(loadMoreFromEffect, 100);
        }
      },
      { threshold: [0.75] },
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    const handleTouchStart = (e: TouchEvent) => {
      isTouchDevice = true;
      if (!isVisible) return;
      const { touches } = e;
      if (touches.length !== 1) return;
      setTouchState('START');
      const touch = touches[0]!;
      touchStartPoint = { x: touch.screenX, y: touch.screenY };
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isVisible) return;
      if (e.changedTouches.length !== 1) return;
      const start = touchStartPoint;
      if (start == null) return;
      const touch = e.changedTouches[0]!;
      if (shouldTriggerLoad(start, { x: touch.screenX, y: touch.screenY })) {
        setTouchState('WILL_LOAD');
      } else {
        setTouchState('START');
      }
    };

    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    const handleTouchEnd = (e: TouchEvent) => {
      setTouchState('NONE');
      if (!isVisible) return;
      if (e.changedTouches.length !== 1) return;
      const start = touchStartPoint;
      if (start == null) return;
      const touch = e.changedTouches[0]!;
      if (shouldTriggerLoad(start, { x: touch.screenX, y: touch.screenY })) {
        loadTimer = setTimeout(() => {
          loadMoreFromEffect();
        }, 100);
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      observer.disconnect();
      isLoadMoreVisibleRef.current = false;
      window.clearTimeout(autoLoadTimeout);
      window.clearTimeout(stalePageRetryTimeoutRef.current);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (loadTimer !== undefined) clearTimeout(loadTimer);
    };
  }, [chatInitialized]);

  const willLoad = touchState === 'WILL_LOAD';
  return (
    <Button ref={loadMoreRef} disabled={isLoading} onClick={() => void loadMore()}>
      <div className="flex w-36 items-center justify-between gap-1">
        {isLoading ? (
          <CircleNotch className="animate-spin" />
        ) : (
          <ChevronDown
            className={clsx('transition-transform duration-300', willLoad && 'rotate-180')}
          />
        )}

        <div className="grow text-center">
          {touchState === 'START' && <FormattedMessage defaultMessage="Pull to Load" />}
          {willLoad && <FormattedMessage defaultMessage="Release to Load" />}
          {touchState === 'NONE' && <FormattedMessage defaultMessage="Load More" />}
        </div>
      </div>
    </Button>
  );
};
