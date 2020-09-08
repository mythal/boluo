import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from '../../store';
import { get } from '../../api/request';
import { LoadMessages } from '../../actions/chat';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import rotateIcon from '../../assets/icons/rotate-cw.svg';
import styled from '@emotion/styled';
import { bgColor } from '../../styles/colors';
import { usePane } from '../../hooks/usePane';

export const loadMoreHeight = 60;

export const LoadMoreContainer = styled.div`
  background-color: ${bgColor};
  height: ${loadMoreHeight}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface Props {
  shift: (offset: number) => void;
}

function LoadMore({ shift }: Props) {
  const pane = usePane();
  const channelId = useSelector((state) => state.chatPane[pane]!.channel.id);
  const before = useSelector((state) => state.chatPane[pane]!.messageBefore);
  const finished = useSelector((state) => state.chatPane[pane]!.finished);
  const moving = useSelector((state) => state.chatPane[pane]!.moving);
  const dispatch = useDispatch();
  const button = useRef<HTMLButtonElement | null>(null);
  const mounted = useRef(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeout: number | undefined = undefined;
    timeout = window.setTimeout(() => {
      button.current?.click();
    }, 500);
    return () => {
      mounted.current = false;
      window.clearTimeout(timeout);
    };
  }, []);

  if (finished) {
    return <LoadMoreContainer>Ω</LoadMoreContainer>;
  }
  const loadMore = async () => {
    const limit = 64;
    if (mounted.current) {
      setLoading(true);
    }
    const result = await get('/messages/by_channel', { channelId, before, limit });
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
    shift(messages.length);
    dispatch<LoadMessages>({ type: 'LOAD_MESSAGES', messages, finished, pane });
  };
  return (
    <LoadMoreContainer>
      <Button data-small ref={button} onClick={loadMore} disabled={loading || moving}>
        {loading ? <Icon sprite={rotateIcon} loading /> : '载入更多'}
      </Button>
    </LoadMoreContainer>
  );
}

export default React.memo(LoadMore);
