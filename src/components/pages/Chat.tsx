import * as React from 'react';
import { useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import ChatSidebar from '../organisms/ChatSidebar';
import { decodeUuid, Id } from '../../utils/id';
import ChannelChat from '../organisms/ChannelChat';
import ChatHome from '../organisms/ChatHome';
import { useRefetch, useSpaceWithRelated } from '../../hooks';
import { RenderError } from '../molecules/RenderError';
import BasePage from '../templates/BasePage';

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
  const [result, refetch] = useSpaceWithRelated(spaceId);
  useRefetch(refetch, 64);
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
