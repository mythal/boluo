import * as React from 'react';
import { useEffect } from 'react';
import { Route, Switch, useHistory, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import Sidebar from '../chat/Sidebar';
import { decodeUuid, encodeUuid, Id } from '../../utils/id';
import ChannelChat from '../chat/ChannelChat';
import Home from '../chat/Home';
import { RenderError } from '../molecules/RenderError';
import BasePage from '../templates/BasePage';
import { useDispatch, useSelector } from '../../store';
import { errLoading, LOADING } from '../../api/error';
import { AppResult } from '../../api/request';
import { SpaceWithRelated } from '../../api/spaces';
import PageLoading from '../../components/molecules/PageLoading';
import { css, Global } from '@emotion/core';
import { PaneContext } from '../../hooks/useChannelId';
import { chatPath } from '../../utils/path';
import { breakpoint, mediaQuery } from '../../styles/atoms';
import { useHeartbeat } from '../chat/Heartbeat';
import { useAtom } from 'jotai';
import { userDialogAtom } from '../../states/userDialog';
import MemberDialog from '../chat/MemberDialog';
import { useMyId } from '../../hooks/useMyId';
import { Provider } from 'jotai';
import { Connector } from '../chat/Connector';
import { loadSpace } from '../../actions';

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
  grid-template-rows: 3rem 1fr auto;

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

function Chat() {
  const params = useParams<Params>();
  const [userDialog, setUserDialog] = useAtom(userDialogAtom);
  const spaceId: Id = decodeUuid(params.spaceId);
  const channelId: Id | undefined = params.channelId && decodeUuid(params.channelId);
  const myId: Id | undefined = useMyId();
  const history = useHistory();
  useLoadSpace(spaceId);
  useHeartbeat();
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

  if (!space.allowSpectator && !(myId && members[myId])) {
    history.replace(`/space/${encodeUuid(spaceId)}`);
  }
  return (
    <Container>
      <Connector />
      <Global styles={viewHeight} />
      <Sidebar space={space} channels={channels} />
      <Switch>
        {channelId && (
          <Route path={chatPath(spaceId, channelId)}>
            <PaneContext.Provider value={channelId}>
              <Provider key={channelId} scope={channelId}>
                <ChannelChat key={channelId} spaceId={spaceId} channelId={channelId} />
              </Provider>
            </PaneContext.Provider>
          </Route>
        )}
        <Route path={chatPath(spaceId)}>
          <Home members={members} channels={channels} space={space} />
        </Route>
      </Switch>

      {userDialog && <MemberDialog userId={userDialog} spaceId={spaceId} dismiss={() => setUserDialog(null)} />}
    </Container>
  );
}

export default Chat;
