import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Route, Switch, useHistory, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import Sidebar from '../chat/Sidebar';
import { decodeUuid, encodeUuid, Id } from '../../utils/id';
import ChannelChat from '../chat/ChannelChat';
import Home from '../chat/Home';
import { RenderError } from '../molecules/RenderError';
import BasePage from '../templates/BasePage';
import { useDispatch, useSelector } from '../../store';
import { connectSpace, loadSpace, SpaceUpdated } from '../../actions/ui';
import { errLoading, LOADING } from '../../api/error';
import { AppResult } from '../../api/request';
import { SpaceWithRelated } from '../../api/spaces';
import PageLoading from '../../components/molecules/PageLoading';
import { css, Global } from '@emotion/core';
import { PaneContext } from '../../hooks/usePane';
import { chatPath } from '../../utils/path';
import { breakpoint, mediaQuery } from '../../styles/atoms';
import { connect } from '../../api/connect';
import { Events } from '../../api/events';
import { showFlash } from '../../actions/flash';

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
  // grid-template-columns: auto 1fr 1fr;
  // grid-template-areas:
  //   'sidebar-header header header'
  //   'sidebar-body list list'
  //   'sidebar-body compose compose';

  grid-template-columns: auto 1fr;
  grid-template-areas:
    'sidebar-header header'
    'sidebar-body list'
    'sidebar-body compose';
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

function useLoadSpace(spaceId: Id) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadSpace(spaceId));
  }, [spaceId, dispatch]);
}

function useSpaceConnection() {
  const dispatch = useDispatch();
  const spaceId = useSelector((state) => state.ui.spaceId);

  const after = useRef<number>(0);

  const conn = async (): Promise<WebSocket> => {
    if (!spaceId) {
      throw new Error('unexpected');
    }
    const connection = await connect(spaceId);
    connection.onerror = (e) => {
      console.warn(e);
    };

    connection.onmessage = (wsMsg) => {
      const last = after.current;
      const event = JSON.parse(wsMsg.data) as Events;
      // if (event.timestamp < last) {
      //   return;
      // }
      after.current = event.timestamp;
      const { body } = event;
      if (body.type === 'SPACE_UPDATED') {
        const { spaceWithRelated } = body;
        const action: SpaceUpdated = { type: 'SPACE_UPDATED', spaceWithRelated };
        dispatch(action);
      } else {
        dispatch({ type: 'EVENT_RECEIVED', event });
      }
    };
    // connection.onclose = (e) => {
    //   console.warn(e);
    //   window.setTimeout(() => {dispatch}, 5000);
    // };
    return connection;
  };

  useEffect(() => {
    if (spaceId) {
      (async () => {
        const connection = await conn();
        dispatch(connectSpace(spaceId, connection));
        return () => {
          connection.onerror = null;
          connection.onclose = null;
          connection.close();
        };
      })();
    }
  }, [spaceId, dispatch]);
}

function Chat() {
  const params = useParams<Params>();
  // const activePane = useSelector((state) => state.activePane);
  const spaceId: Id = decodeUuid(params.spaceId);
  const channelId: Id | undefined = params.channelId && decodeUuid(params.channelId);
  const myId: Id | undefined = useSelector((state) => state.profile?.user.id);
  const history = useHistory();
  const dispatch = useDispatch();
  // const [leftChannel, setLeftChannel] = useState<Id | undefined>(channelId);
  // const [rightChannel, setRightChannel] = useState<Id | undefined>(channelId);
  // // sync active
  // useEffect(() => {
  //   if (activePane === 0) {
  //     setLeftChannel(channelId);
  //   } else if (activePane === 1) {
  //     setRightChannel(channelId);
  //   }
  // }, [channelId, activePane]);

  // set split pane
  // useEffect(() => {
  //   if (isSplit) {
  //     if (activePane === 0) {
  //       setRightChannel(leftChannel);
  //     } else if (activePane === 1) {
  //       setLeftChannel(rightChannel);
  //     }
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [isSplit]);

  // maybe polling is more suitable?
  useLoadSpace(spaceId);
  useSpaceConnection();
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

  if (!space.allowSpectator && (!myId || !members[myId])) {
    history.replace(`/space/${encodeUuid(spaceId)}`);
  }
  // const left = activePane === 0 ? channelId : leftChannel;
  // const right = activePane === 1 ? channelId : rightChannel;
  return (
    <Container>
      <Global styles={viewHeight} />
      <Sidebar space={space} channels={channels} />
      <Switch>
        {channelId && (
          <Route path={chatPath(spaceId, channelId)}>
            <PaneContext.Provider value={channelId}>
              <ChannelChat key={channelId} spaceId={spaceId} channelId={channelId} pane={channelId} />
            </PaneContext.Provider>
          </Route>
        )}
        <Route path={chatPath(spaceId)}>
          <Home members={members} channels={channels} space={space} />
        </Route>
      </Switch>

      {/*<Route path={activePane === 1 ? chatPath(spaceId, channelId) : chatPath(spaceId)}>*/}
      {/*  <PaneContext.Provider value={1}>*/}
      {/*    {(isSplit || activePane === 1) &&*/}
      {/*      (right ? (*/}
      {/*        <ChannelChat spaceId={spaceId} channelId={right} pane={1} />*/}
      {/*      ) : (*/}
      {/*        <Home members={members} channels={channels} space={space} />*/}
      {/*      ))}*/}
      {/*  </PaneContext.Provider>*/}
      {/*</Route>*/}
    </Container>
  );
}

export default Chat;
