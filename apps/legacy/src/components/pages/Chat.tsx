import { css, Global } from '@emotion/react';
import styled from '@emotion/styled';
import { useAtom, useSetAtom } from 'jotai';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadSpace } from '../../actions';
import { errLoading, LOADING } from '../../api/error';
import { type AppResult } from '../../api/request';
import { type SpaceWithRelated } from '../../api/spaces';
import PageLoading from '../../components/molecules/PageLoading';
import { PaneContext } from '../../hooks/useChannelId';
import { useMyId } from '../../hooks/useMyId';
import { userDialogAtom } from '../../states/userDialog';
import { useDispatch, useSelector } from '../../store';
import { breakpoint, mediaQuery } from '../../styles/atoms';
import { decodeUuid, encodeUuid, type Id } from '../../utils/id';
import { chatPath } from '../../utils/path';
import ChannelChat from '../chat/ChannelChat';
import { Connector } from '../chat/Connector';
import { useHeartbeat } from '../chat/Heartbeat';
import Home from '../chat/Home';
import MemberDialog from '../chat/MemberDialog';
import Sidebar from '../chat/Sidebar';
import { RenderError } from '../molecules/RenderError';
import BasePage from '../templates/BasePage';

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

  grid-template-columns: auto 1fr 1fr;
  grid-template-areas:
    'sidebar-header header'
    'sidebar-body list'
    'sidebar-body compose';
  &[data-split='1'],
  &[data-split='0'] {
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'sidebar-header header'
      'sidebar-body list'
      'sidebar-body compose';
  }

  &[data-split='2'] {
    grid-template-columns: auto 1fr 1fr;
    grid-template-areas:
      'sidebar-header header header'
      'sidebar-body list list'
      'sidebar-body compose compose';
  }

  &[data-split='3'] {
    grid-template-columns: auto 1fr 1fr 1fr;
    grid-template-areas:
      'sidebar-header header header header'
      'sidebar-body list list list'
      'sidebar-body compose compose compose';
  }

  &[data-split='4'] {
    grid-template-columns: auto 1fr 1fr 1fr 1fr;
    grid-template-areas:
      'sidebar-header header header header header'
      'sidebar-body list list list list'
      'sidebar-body compose compose compose compose';
  }

  &[data-split='5'] {
    grid-template-columns: auto 1fr 1fr 1fr 1fr 1fr;
    grid-template-areas:
      'sidebar-header header header header header header'
      'sidebar-body list list list list list'
      'sidebar-body compose compose compose compose compose';
  }
`;

function useLoadSpace(spaceId: Id) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadSpace(spaceId));
  }, [spaceId, dispatch]);
}

function Chat() {
  const params = useParams();
  const [userDialog, setUserDialog] = useAtom(userDialogAtom);
  const spaceId: Id = decodeUuid(params?.spaceId ?? '');
  const channelId: Id | undefined = params.channelId && decodeUuid(params.channelId);
  const prevChannelId = useRef<typeof channelId>(channelId);
  const myId: Id | undefined = useMyId();
  const navigate = useNavigate();
  const [focused, setFocused] = useState(0);
  const [paneList, setPaneList] = useState<Id[]>(channelId ? [channelId] : []);
  useLoadSpace(spaceId);
  useHeartbeat();
  useEffect(() => {
    if (!channelId || channelId === prevChannelId.current) {
      return;
    }
    prevChannelId.current = channelId;
    if (paneList.length <= 1) {
      setPaneList([channelId]);
      setFocused(0);
    }
    if (focused < paneList.length && channelId && paneList[focused] !== channelId) {
      setPaneList((paneList) => {
        const nextList = [...paneList];
        nextList[focused] = channelId;
        return nextList;
      });
    }
  }, [channelId, focused, paneList]);
  const result: AppResult<SpaceWithRelated> = useSelector((state) =>
    state.ui.spaceSet.get(spaceId, errLoading()),
  );
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
    navigate(`/space/${encodeUuid(spaceId)}`, { replace: true });
  }
  return (
    <Container data-split={paneList.length}>
      <Connector key={spaceId} spaceId={spaceId} myId={myId} />
      <Global styles={viewHeight} />
      <Sidebar space={space} channels={channels} />

      {channelId ? (
        paneList.map((paneId, index) => {
          const focus = () => {
            navigate(chatPath(spaceId, paneId), { replace: true });
            setFocused(index);
          };

          const split = () =>
            setPaneList((panes) => {
              const nextPanes = [...panes];
              nextPanes.splice(index, 0, paneId);
              return nextPanes;
            });

          const close =
            paneList.length < 2
              ? undefined
              : () =>
                  setPaneList((panes) => {
                    const nextPanes = [...panes];
                    nextPanes.splice(index, 1);
                    return nextPanes;
                  });
          return (
            <PaneContext
              key={index}
              value={{
                id: paneId,
                split,
                close,
                isFocused: index === focused,
              }}
            >
              <ChannelChat focus={focus} key={paneId} spaceId={spaceId} channelId={paneId} />
            </PaneContext>
          );
        })
      ) : (
        <Home members={members} channels={channels} space={space} />
      )}

      {userDialog && (
        <MemberDialog userId={userDialog} spaceId={spaceId} dismiss={() => setUserDialog(null)} />
      )}
    </Container>
  );
}

export default Chat;
