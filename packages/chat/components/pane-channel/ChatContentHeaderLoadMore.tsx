import { get } from '@boluo/api-browser';
import clsx from 'clsx';
import { ChevronDown, CircleNotch } from '@boluo/icons';
import { useSetAtom, useStore } from 'jotai';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { useMountedRef } from '../../hooks/useMounted';
import { chatAtom } from '../../state/chat.atoms';

const LOAD_MESSAGE_LIMIT = 101;
const AUTO_LOAD = false;

interface Point {
  x: number;
  y: number;
}

const shouldTriggerLoad = (start: Point, end: Point) => {
  return end.y - start.y > 20;
};

export const ChatContentHeaderLoadMore: FC<{ isTopChunk: boolean; chunkUp: () => void }> = ({
  isTopChunk,
  chunkUp,
}) => {
  const channelId = useChannelId();
  const isTouchDeviceRef = useRef(false);
  const mountedRef = useMountedRef();
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const store = useStore();
  const dispatch = useSetAtom(chatAtom);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  isLoadingRef.current = isLoading;
  const isVisibleRef = useRef(false);
  const setBanner = useSetBanner();

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !mountedRef.current) return;
    if (!isTopChunk) {
      chunkUp();
      return;
    }
    const chatState = store.get(chatAtom);
    const channelState = chatState.channels[channelId];
    setIsLoading(true);
    let before: number | null = null;
    if (channelState && channelState.messages.length > 0) {
      before = channelState.messages[0]!.pos;
    }
    const fetchPromise = get('/messages/by_channel', { channelId, before, limit: LOAD_MESSAGE_LIMIT });
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
        timestamp: new Date().getTime(),
        messages: newMessages,
        fullLoaded: newMessages.length < LOAD_MESSAGE_LIMIT,
      },
    });
    setIsLoading(false);
  }, [channelId, chunkUp, dispatch, mountedRef, isTopChunk, setBanner, store]);

  const autoLoadTimeoutRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) return;
        const entry = entries[0]!;
        isVisibleRef.current = entry.isIntersecting;
        window.clearTimeout(autoLoadTimeoutRef.current);
        if (AUTO_LOAD && !isTopChunk && entry.isIntersecting && !isTouchDeviceRef.current) {
          autoLoadTimeoutRef.current = window.setTimeout(chunkUp, 100);
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
  }, [chunkUp, isTopChunk]);

  return (
    <Button ref={loadMoreRef} disabled={isLoading} onClick={loadMore}>
      <div className="flex w-36 items-center justify-between gap-1">
        {isLoading ? (
          <CircleNotch className="animate-spin" />
        ) : (
          <ChevronDown className={clsx('transition-transform duration-300')} />
        )}

        <div className="flex-grow text-center">
          <FormattedMessage defaultMessage="Load More" />
        </div>
      </div>
    </Button>
  );
};
