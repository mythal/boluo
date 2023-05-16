import { get } from 'api-browser';
import { ChevronDown, CircleNotch } from 'icons';
import { useStore } from 'jotai';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { useChannelId } from '../../hooks/useChannelId';
import { useIsFullLoaded } from '../../hooks/useIsFullLoaded';
import { useMountedRef } from '../../hooks/useMounted';
import { chatListAtomFamily } from '../../state/chat-list.atoms';
import { useChatDispatch } from '../../state/chat.atoms';

const LOAD_MESSAGE_LIMIT = 51;

interface Point {
  x: number;
  y: number;
}

const shouldTriggerLoad = (start: Point, end: Point) => {
  return end.y - start.y > 20;
};

export const ChatContentHeader: FC = () => {
  const isFullLoaded = useIsFullLoaded();
  const channelId = useChannelId();
  const boxRef = useRef<HTMLDivElement>(null);
  const mountedRef = useMountedRef();
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const store = useStore();
  const dispatch = useChatDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [touchState, setTouchState] = useState<'NONE' | 'START' | 'WILL_LOAD'>('NONE');
  const isVisibleRef = useRef(false);
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
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

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.length === 0) return;
      const entry = entries[0]!;
      isVisibleRef.current = entry.isIntersecting;
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
      if (isLoading || !mountedRef.current) return;
      const chatListAtom = chatListAtomFamily(channelId);
      const chatListState = store.get(chatListAtom);
      const minPos = chatListState?.channelState.minPos ?? null;
      setIsLoading(true);
      const before: number | null = minPos;
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
    [channelId, dispatch, isLoading, mountedRef, store],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      loadMoreRef.current?.click();
    }, 200);
    return () => window.clearTimeout(handle);
  }, []);
  const willLoad = touchState === 'WILL_LOAD';
  return (
    <div ref={boxRef} className="h-16 flex items-center justify-center select-none">
      {isFullLoaded
        ? <span className="text-surface-500">Ω</span>
        : (
          <Button ref={loadMoreRef} disabled={isLoading || willLoad} onClick={loadMore}>
            {isLoading ? <CircleNotch className="animate-spin" /> : null}
            {touchState === 'START' && (
              <>
                <ChevronDown />
                <FormattedMessage defaultMessage="Pull" />
              </>
            )}
            {willLoad && <FormattedMessage defaultMessage="Release to Load" />}
            {touchState === 'NONE' && <FormattedMessage defaultMessage="Load More" />}
          </Button>
        )}
    </div>
  );
};
