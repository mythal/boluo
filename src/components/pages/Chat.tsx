import * as React from 'react';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import ChatSidebar from '../organisms/ChatSidebar';
import { decodeUuid, Id } from '../../utils/id';
import ChannelChat from '../organisms/ChannelChat';
import ChatHome from '../organisms/ChatHome';
import { RenderError } from '../molecules/RenderError';
import BasePage from '../templates/BasePage';
import { useDispatch, useSelector } from '../../store';
import { loadSpace } from '../../actions/ui';
import { errLoading, LOADING } from '../../api/error';
import { AppResult } from '../../api/request';
import { SpaceWithRelated } from '../../api/spaces';
import PageLoading from '../../components/molecules/PageLoading';
import { css } from '@emotion/core';
import { Global } from '@emotion/core';

interface Params {
  spaceId: string;
  channelId?: string;
}

// noinspection CssInvalidPropertyValue
const viewHeight = css`
  html,
  body,
  #root {
    height: 100%;
    scroll-behavior: none;
  }
`;

const Container = styled.div`
  display: grid;
  height: 100%;
  overflow: hidden;
  grid-template-rows: 3rem 1fr auto;
  grid-template-columns: auto minmax(260px, 1fr) auto;
  grid-template-areas:
    'sidebar-header header header'
    'sidebar-body list members'
    'sidebar-body compose compose';
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
    if (result.value.code === LOADING) {
      return <PageLoading text="load space data" />;
    }
    return (
      <BasePage>
        <RenderError error={result.value} more404 />
      </BasePage>
    );
  }
  const { channels, space, members } = result.value;
  return (
    <Container>
      <Global styles={viewHeight} />
      <ChatSidebar space={space} channels={channels} />
      {channelId ? (
        <ChannelChat spaceId={spaceId} channelId={channelId} />
      ) : (
        <ChatHome members={members} channels={channels} space={space} />
      )}
    </Container>
  );
}

export default Chat;
