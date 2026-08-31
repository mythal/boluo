import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  type InitialHistoryLoadFailed,
  type InitialHistoryLoadStarted,
  type LoadMessages,
} from '../../actions';
import { get } from '../../api/request';
import RotateCw from '@boluo/icons/legacy/RotateCw';
import { useChannelId } from '../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../store';
import { getOldestMessage } from '../../states/chat-item-set';
import { newId } from '../../utils/id';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';

export const loadMoreHeight = 60;

export function LoadMoreContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-legacy-background flex h-[60px] items-center justify-center">{children}</div>
  );
}

function LoadMore() {
  const pane = useChannelId();
  const channelId = useSelector((state) => state.chatStates.get(pane)!.channel.id);
  const spaceId = useSelector((state) => state.chatStates.get(pane)!.channel.spaceId);
  const before = useSelector((state) => {
    const itemSet = state.chatStates.get(pane)?.itemSet;
    return itemSet ? getOldestMessage(itemSet)?.pos : undefined;
  });
  const finished = useSelector((state) => state.chatStates.get(pane)!.finished);
  const historyMutationGeneration = useSelector(
    (state) => state.chatStates.get(pane)!.historyMutationGeneration,
  );
  const moving = useSelector((state) => state.chatStates.get(pane)!.moving);
  const dispatch = useDispatch();
  const button = useRef<HTMLButtonElement | null>(null);
  const mounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const initialized = useSelector((state) => state.chatStates.get(pane)!.initialized);

  useEffect(() => {
    if (initialized) {
      let timer: number | undefined;
      const observer = new IntersectionObserver(() => {
        timer = window.setTimeout(() => {
          if (!button.current) {
            return;
          }
          const node = button.current;
          if (node.getBoundingClientRect().top >= 0) {
            node.click();
          }
        }, 50);
      }, {});
      if (button.current) {
        observer.observe(button.current);
      }
      return () => {
        mounted.current = false;
        observer.disconnect();
        if (timer !== undefined) window.clearTimeout(timer);
      };
    }
  }, [initialized]);

  if (finished) {
    return <LoadMoreContainer>Ω</LoadMoreContainer>;
  }
  const loadMore = async () => {
    const limit = 32;
    const requestId = newId();
    if (before === undefined) {
      dispatch<InitialHistoryLoadStarted>({
        type: 'INITIAL_HISTORY_LOAD_STARTED',
        requestId,
        pane,
      });
    }
    if (mounted.current) {
      setLoading(true);
    }
    const result = await get('/messages/by_channel', {
      channelId,
      spaceId,
      before: before ?? null,
      limit,
    });
    if (mounted.current) {
      setLoading(false);
    }
    if (!result.isOk) {
      if (before === undefined) {
        dispatch<InitialHistoryLoadFailed>({
          type: 'INITIAL_HISTORY_LOAD_FAILED',
          requestId,
          pane,
        });
      }
      return;
    }
    const messages = result.value;
    let finished = true;
    if (messages.length >= limit) {
      messages.pop();
      finished = false;
    }
    const action: LoadMessages =
      before !== undefined
        ? {
            type: 'LOAD_MESSAGES',
            mode: 'MORE',
            before,
            historyMutationGeneration,
            messages,
            finished,
            pane,
          }
        : {
            type: 'LOAD_MESSAGES',
            mode: 'INITIAL',
            requestId,
            messages,
            finished,
            pane,
          };
    dispatch(action);
  };
  return (
    <LoadMoreContainer>
      <Button size="small" ref={button} onClick={loadMore} disabled={loading || moving}>
        {loading ? <Icon icon={RotateCw} loading /> : '载入更多'}
      </Button>
    </LoadMoreContainer>
  );
}

export default React.memo(LoadMore);
