import { get } from '@boluo/api-browser';
import clsx from 'clsx';
import ChevronDown from '@boluo/icons/ChevronDown';
import CircleNotch from '@boluo/icons/CircleNotch';
import { useSetAtom, useStore } from 'jotai';
import { type FC, useEffect, useEffectEvent, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { useMountedRef } from '@boluo/hooks/useMounted';
import { chatAtom } from '../../state/chat.atoms';
import { head } from 'list';
import { useMember } from '../../hooks/useMember';

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
  const member = useMember();
  const mountedRef = useMountedRef();
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const store = useStore();
  const dispatch = useSetAtom(chatAtom);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const [touchState, setTouchState] = useState<'NONE' | 'START' | 'WILL_LOAD'>('NONE');
  const setBanner = useSetBanner();

  const loadMore = async () => {
    if (isLoadingRef.current || !mountedRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    const chatState = store.get(chatAtom);
    const channelState = chatState.channels[channelId];
    const before: number | null = channelState ? (head(channelState.messages)?.pos ?? null) : null;
    try {
      const result = await get('/messages/by_channel', {
        channelId,
        spaceId: member?.space.spaceId ?? null,
        before,
        limit: LOAD_MESSAGE_LIMIT,
      });
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
      window.clearTimeout(autoLoadTimeout);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (loadTimer !== undefined) clearTimeout(loadTimer);
    };
  }, []);

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
