import { useGet } from 'common';
import { CircleNotch } from 'icons';
import { useStore } from 'jotai';
import { FC, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { useChannelId } from '../../hooks/useChannelId';
import { useIsFullLoaded } from '../../hooks/useIsFullLoaded';
import { useMountedRef } from '../../hooks/useMounted';
import { chatListAtomFamily } from '../../state/chat-list.atoms';
import { useChatDispatch } from '../../state/chat.atoms';

const LOAD_MESSAGE_LIMIT = 51;
export const ChatListHeader: FC = () => {
  const isFullLoaded = useIsFullLoaded();
  const channelId = useChannelId();
  const boxRef = useRef<HTMLDivElement>(null);
  const mountedRef = useMountedRef();
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const store = useStore();
  const get = useGet();
  const dispatch = useChatDispatch();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(() => {
      window.setTimeout(() => {
        if (!loadMoreRef.current) {
          return;
        }
        const node = loadMoreRef.current;
        if (node.getBoundingClientRect().top >= 0) {
          node.click();
        }
      }, 50);
    }, {});
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);
  const loadMore = async () => {
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
  };
  return (
    <div ref={boxRef} className="h-16 flex items-center justify-center select-none">
      {isFullLoaded
        ? <span className="text-surface-500">Ω</span>
        : (
          <Button ref={loadMoreRef} disabled={isLoading} onClick={loadMore}>
            {isLoading ? <CircleNotch className="animate-spin" /> : null}
            <FormattedMessage defaultMessage="Load More" />
          </Button>
        )}
    </div>
  );
};
