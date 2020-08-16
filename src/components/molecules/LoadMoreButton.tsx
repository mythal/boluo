import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from '@/store';
import { get } from '@/api/request';
import { LoadMessages } from '@/actions/chat';
import Button from '@/components/atoms/Button';
import Icon from '../atoms/Icon';
import rotateIcon from '@/assets/icons/rotate-cw.svg';
import styled from '@emotion/styled';
import { bgColor } from '@/styles/colors';
import { pY } from '@/styles/atoms';

export const LoadMoreContainer = styled.div`
  background-color: ${bgColor};
  display: flex;
  ${pY(2)};
  align-items: center;
  justify-content: center;
`;

function LoadMoreButton() {
  const channelId = useSelector((state) => state.chat!.channel.id);
  const before = useSelector((state) => state.chat!.messageBefore);
  const finished = useSelector((state) => state.chat!.finished);
  const dispatch = useDispatch();
  const button = useRef<HTMLButtonElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => button.current?.click(), 1000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (finished) {
    return null;
  }
  const loadMore = async () => {
    const limit = 64;
    setLoading(true);
    const result = await get('/messages/by_channel', { channelId, before, limit });
    setLoading(false);
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
    dispatch<LoadMessages>({ type: 'LOAD_MESSAGES', messages, finished });
  };
  return (
    <Button data-small ref={button} onClick={loadMore} disabled={loading}>
      {loading ? <Icon sprite={rotateIcon} loading /> : '载入更多'}
    </Button>
  );
}

export default LoadMoreButton;
