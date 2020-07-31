import * as React from 'react';
import { useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import ChatSidebar from '../organisms/ChatSidebar';
import { decodeUuid, Id } from '@/utils/id';
import ChannelChat from '../organisms/ChannelChat';
import ChatHome from '../organisms/ChatHome';
import { RenderError } from '../molecules/RenderError';
import BasePage from '../templates/BasePage';
import { useEffect } from 'react';
import { useDispatch, useSelector } from '@/store';
import { loadSpace } from '@/actions/ui';
import { errLoading } from '@/api/error';
import { AppResult } from '@/api/request';
import { SpaceWithRelated } from '@/api/spaces';

interface Params {
  spaceId: string;
  channelId?: string;
}

const Container = styled.div`
  display: grid;
  height: 100vh;
  overflow: hidden;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    'sidebar header'
    'sidebar list'
    'sidebar compose';
`;

function Chat() {
  const params = useParams<Params>();
  const spaceId: Id = decodeUuid(params.spaceId);
  const channelId: Id | undefined = params.channelId && decodeUuid(params.channelId);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadSpace(spaceId));
  }, [spaceId, dispatch]);
  const result: AppResult<SpaceWithRelated> = useSelector((state) => state.ui.spaceSet.get(spaceId, errLoading()));
  if (!result.isOk) {
    return (
      <BasePage>
        <RenderError error={result.value} more404 />
      </BasePage>
    );
  }
  const { channels, space, members } = result.value;
  return (
    <Container>
      <ChatSidebar channels={channels} />
      {channelId ? <ChannelChat spaceId={spaceId} channelId={channelId} /> : <ChatHome />}
    </Container>
  );
}

export default Chat;
