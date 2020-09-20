import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Route, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import Sidebar from '../chat/Sidebar';
import { decodeUuid, Id } from '../../utils/id';
import ChannelChat from '../chat/ChannelChat';
import Home from '../chat/Home';
import { RenderError } from '../molecules/RenderError';
import BasePage from '../templates/BasePage';
import { useDispatch, useSelector } from '../../store';
import { loadSpace, SpaceUpdated } from '../../actions/ui';
import { errLoading, LOADING } from '../../api/error';
import { AppResult } from '../../api/request';
import { SpaceWithRelated } from '../../api/spaces';
import PageLoading from '../../components/molecules/PageLoading';
import { css, Global } from '@emotion/core';
import { PaneContext } from '../../hooks/usePane';
import { chatPath } from '../../utils/path';
import { breakpoint, mediaQuery } from '../../styles/atoms';
import { connect } from '../../api/connect';
import { SpaceEvent } from '../../api/events';

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
    font-size: 14px;

    ${mediaQuery(breakpoint.md)} {
      font-size: 16px;
    }
  }
`;

const Container = styled.div`
  display: grid;
  height: 100%;
  // overflow: hidden;
  grid-template-rows: 3rem 1fr auto;
  grid-template-columns: auto 1fr 1fr;
  grid-template-areas:
    'sidebar-header header header'
    'sidebar-body list list'
    'sidebar-body compose compose';

  &[data-split='false'] {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'sidebar-header header'
      'sidebar-body list'
      'sidebar-body compose';
  }

  &[data-split='true'] {
    grid-template-columns: auto 1fr 1fr;
    grid-template-areas:
      'sidebar-header header header'
      'sidebar-body list list'
      'sidebar-body compose compose';
  }
`;

function useSpaceMailbox(spaceId: Id) {
  const dispatch = useDispatch();
  const connection = useRef<WebSocket | null>(null);

  useEffect(() => {
    const conn = () => {
      connection.current = connect(spaceId, 'SPACE', 0);
      connection.current.onmessage = (wsMsg) => {
        const event = JSON.parse(wsMsg.data) as SpaceEvent;
        const { body } = event;
        if (body.type === 'SPACE_UPDATED') {
          const { spaceWithRelated } = body;
          const action: SpaceUpdated = { type: 'SPACE_UPDATED', spaceWithRelated };
          dispatch(action);
        }
      };
      connection.current.onclose = () => {
        window.setTimeout(conn, 5000);
      };
    };
    conn();
    return () => {
      if (connection.current) {
        connection.current.onerror = null;
        connection.current.onclose = null;
        connection.current.close();
      }
    };
  }, [spaceId, dispatch]);
}

function Chat() {
  const params = useParams<Params>();
  const activePane = useSelector((state) => state.activePane);
  const isSplit = useSelector((state) => state.splitPane);
  const spaceId: Id = decodeUuid(params.spaceId);
  const channelId: Id | undefined = params.channelId && decodeUuid(params.channelId);
  const dispatch = useDispatch();
  const [leftChannel, setLeftChannel] = useState<Id | undefined>(channelId);
  const [rightChannel, setRightChannel] = useState<Id | undefined>(channelId);
  useEffect(() => {
    if (activePane === 0) {
      setLeftChannel(channelId);
    } else if (activePane === 1) {
      setRightChannel(channelId);
    }
  }, [channelId, activePane]);

  useEffect(() => {
    if (isSplit) {
      if (activePane === 0) {
        setRightChannel(leftChannel);
      } else if (activePane === 1) {
        setLeftChannel(rightChannel);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSplit]);

  useEffect(() => {
    dispatch(loadSpace(spaceId));
  }, [spaceId, dispatch]);

  // maybe polling is more suitable?
  useSpaceMailbox(spaceId);

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
  const left = activePane === 0 ? channelId : leftChannel;
  const right = activePane === 1 ? channelId : rightChannel;
  return (
    <Container data-split={isSplit}>
      <Global styles={viewHeight} />
      <Sidebar space={space} channels={channels} />
      <Route path={activePane === 0 ? chatPath(spaceId, channelId) : chatPath(spaceId)}>
        <PaneContext.Provider value={0}>
          {(isSplit || activePane === 0) &&
            (left ? (
              <ChannelChat spaceId={spaceId} channelId={left} pane={0} />
            ) : (
              <Home members={members} channels={channels} space={space} />
            ))}
        </PaneContext.Provider>
      </Route>

      <Route path={activePane === 1 ? chatPath(spaceId, channelId) : chatPath(spaceId)}>
        <PaneContext.Provider value={1}>
          {(isSplit || activePane === 1) &&
            (right ? (
              <ChannelChat spaceId={spaceId} channelId={right} pane={1} />
            ) : (
              <Home members={members} channels={channels} space={space} />
            ))}
        </PaneContext.Provider>
      </Route>
    </Container>
  );
}

export default Chat;
