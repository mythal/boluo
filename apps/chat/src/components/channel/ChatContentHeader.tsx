import { get } from 'api-browser';
import clsx from 'clsx';
import { ChevronDown, CircleNotch } from 'icons';
import { useStore } from 'jotai';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { useChannelId } from '../../hooks/useChannelId';
import { useIsFullLoaded } from '../../hooks/useIsFullLoaded';
import { useMountedRef } from '../../hooks/useMounted';
import { chatAtom, useChatDispatch } from '../../state/chat.atoms';

const LOAD_MESSAGE_LIMIT = 51;

interface Point {
  x: number;
  y: number;
}

const shouldTriggerLoad = (start: Point, end: Point) => {
  return end.y - start.y > 20;
};

const AUTO_LOAD = true;
export const ChatContentHeader: FC = () => {
  const isFullLoaded = useIsFullLoaded();
  const channelId = useChannelId();
  const isTouchDeviceRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const mountedRef = useMountedRef();
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const store = useStore();
  const dispatch = useChatDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  isLoadingRef.current = isLoading;
  const [touchState, setTouchState] = useState<'NONE' | 'START' | 'WILL_LOAD'>('NONE');
  const isVisibleRef = useRef(false);
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null);

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
      if (start === null) return;
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
      if (start === null) return;
      const touch = e.changedTouches[0]!;
      if (shouldTriggerLoad(start, { x: touch.screenX, y: touch.screenY })) {
        loadMoreRef.current?.click();
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
  }, []);

  const autoLoadTimeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.length === 0) return;
      const entry = entries[0]!;
      isVisibleRef.current = entry.isIntersecting;
      window.clearTimeout(autoLoadTimeoutRef.current);
      if (AUTO_LOAD && entry.isIntersecting && !isTouchDeviceRef.current) {
        autoLoadTimeoutRef.current = window.setTimeout(() => {
          loadMoreRef.current?.click();
        }, 500);
      }
    }, { threshold: [0.75] });
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);
  const loadMore = useCallback(
    async () => {
      if (isLoadingRef.current || !mountedRef.current) return;
      const chatState = store.get(chatAtom);
      const channelState = chatState.channels[channelId];
      if (!channelState) return;
      setIsLoading(true);
      const before: number | null = channelState.messages.length === 0 ? null : channelState.messages[0]!.pos;
      const fetchPromise = get('/messages/by_channel', { channelId, before, limit: LOAD_MESSAGE_LIMIT });
      const result = await fetchPromise;
      if (result.isErr) {
        // TODO: error handing
        setIsLoading(false);
        return;
      }
      const newMessages = result.some;
      dispatch('messagesLoaded', {
        before,
        channelId,
        messages: newMessages,
        fullLoaded: newMessages.length < LOAD_MESSAGE_LIMIT,
      });
      setIsLoading(false);
    },
    [channelId, dispatch, mountedRef, store],
  );

  const willLoad = touchState === 'WILL_LOAD';
  return (
    <div ref={boxRef} className="h-16 flex items-center justify-center select-none">
      {isFullLoaded
        ? <span className="text-surface-500">Ω</span>
        : (
          <Button ref={loadMoreRef} disabled={isLoading} onClick={loadMore}>
            <div className="w-36 flex gap-1 justify-between items-center">
              {isLoading
                ? <CircleNotch className="animate-spin" />
                : <ChevronDown className={clsx('transition-transform duration-300', willLoad && 'rotate-180')} />}

              <div className="text-center flex-grow">
                {touchState === 'START' && <FormattedMessage defaultMessage="Pull to Load" />}
                {willLoad && <FormattedMessage defaultMessage="Release to Load" />}
                {touchState === 'NONE' && <FormattedMessage defaultMessage="Load More" />}
              </div>
            </div>
          </Button>
        )}
    </div>
  );
};
