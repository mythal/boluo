import styled from '@emotion/styled';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { type LoadMessages } from '../../actions';
import { get } from '../../api/request';
import RotateCw from '../../assets/icons/rotate-cw.svg';
import { useChannelId } from '../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../store';
import { bgColor } from '../../styles/colors';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';

export const loadMoreHeight = 60;

export const LoadMoreContainer = styled.div`
  background-color: ${bgColor};
  height: ${loadMoreHeight}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

function LoadMore() {
  const pane = useChannelId();
  const channelId = useSelector((state) => state.chatStates.get(pane)!.channel.id);
  const before = useSelector((state) => {
    const messages = state.chatStates.get(pane)?.itemSet.messages;
    if (!messages) {
      return undefined;
    }
    const oldestMessage = messages.find(
      (item) => item.type === 'MESSAGE' && Number.isFinite(item.pos),
    );
    return oldestMessage?.pos;
  });
  const finished = useSelector((state) => state.chatStates.get(pane)!.finished);
  const moving = useSelector((state) => state.chatStates.get(pane)!.moving);
  const dispatch = useDispatch();
  const button = useRef<HTMLButtonElement | null>(null);
  const mounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const initialized = useSelector((state) => state.chatStates.get(pane)!.initialized);

  useEffect(() => {
    if (initialized) {
      const observer = new IntersectionObserver(() => {
        window.setTimeout(() => {
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
      };
    }
  }, [initialized]);

  if (finished) {
    return <LoadMoreContainer>Ω</LoadMoreContainer>;
  }
  const loadMore = async () => {
    const limit = 32;
    if (mounted.current) {
      setLoading(true);
    }
    const result = await get('/messages/by_channel', {
      channelId,
      before: before ?? null,
      limit,
    });
    if (mounted.current) {
      setLoading(false);
    }
    if (!result.isOk) {
      console.error(result.value);
      return;
    }
    const messages = result.value;
    let finished = true;
    if (messages.length >= limit) {
      messages.pop();
      finished = false;
    }
    dispatch<LoadMessages>({ type: 'LOAD_MESSAGES', messages, finished, pane });
  };
  return (
    <LoadMoreContainer>
      <Button data-small ref={button} onClick={loadMore} disabled={loading || moving}>
        {loading ? <Icon icon={RotateCw} loading /> : '载入更多'}
      </Button>
    </LoadMoreContainer>
  );
}

export default React.memo(LoadMore);
