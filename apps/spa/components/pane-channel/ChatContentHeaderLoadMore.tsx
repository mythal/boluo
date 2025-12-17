import { get } from '@boluo/api-browser';
import clsx from 'clsx';
import { ChevronDown, CircleNotch } from '@boluo/icons';
import { useSetAtom, useStore } from 'jotai';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { useMountedRef } from '@boluo/hooks/useMounted';
import { chatAtom } from '../../state/chat.atoms';
import { head } from 'list';

const LOAD_MESSAGE_LIMIT = 51;
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
  const isTouchDeviceRef = useRef(false);
  const mountedRef = useMountedRef();
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const store = useStore();
  const dispatch = useSetAtom(chatAtom);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  isLoadingRef.current = isLoading;
  const [touchState, setTouchState] = useState<'NONE' | 'START' | 'WILL_LOAD'>('NONE');
  const isVisibleRef = useRef(false);
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null);
  const setBanner = useSetBanner();

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !mountedRef.current) return;
    const chatState = store.get(chatAtom);
    const channelState = chatState.channels[channelId];
    setIsLoading(true);
    const before: number | null = channelState ? (head(channelState.messages)?.pos ?? null) : null;
    const fetchPromise = get('/messages/by_channel', {
      channelId,
      before,
      limit: LOAD_MESSAGE_LIMIT,
    });
    const result = await fetchPromise;
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
      setIsLoading(false);
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
    setIsLoading(false);
  }, [channelId, dispatch, mountedRef, setBanner, store]);

  const autoLoadTimeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) return;
        const entry = entries[0]!;
        isVisibleRef.current = entry.isIntersecting;
        window.clearTimeout(autoLoadTimeoutRef.current);
        if (AUTO_LOAD && entry.isIntersecting && !isTouchDeviceRef.current) {
          autoLoadTimeoutRef.current = window.setTimeout(loadMore, 100);
        }
      },
      { threshold: [0.75] },
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      isTouchDeviceRef.current = true;
      if (!isVisibleRef.current) return;
      const { touches } = e;
      if (touches.length !== 1) return;
      setTouchState('START');
      const touch = touches[0]!;
      touchStartPoint.current = { x: touch.screenX, y: touch.screenY };
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isVisibleRef.current) return;
      if (e.changedTouches.length !== 1) return;
      const start = touchStartPoint.current;
      if (start == null) return;
      const touch = e.changedTouches[0]!;
      if (shouldTriggerLoad(start, { x: touch.screenX, y: touch.screenY })) {
        setTouchState('WILL_LOAD');
      } else {
        setTouchState('START');
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      setTouchState('NONE');
      if (!isVisibleRef.current) return;
      if (e.changedTouches.length !== 1) return;
      const start = touchStartPoint.current;
      if (start == null) return;
      const touch = e.changedTouches[0]!;
      if (shouldTriggerLoad(start, { x: touch.screenX, y: touch.screenY })) {
        setTimeout(() => {
          void loadMore();
        }, 100);
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [loadMore]);

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
