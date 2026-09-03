import { useAtom, useSetAtom } from 'jotai';
import * as React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { cls } from '../../utils/classnames';
import { type Id } from '../../utils/id';
import { isUuid } from '@boluo/utils/id';
import { chatPath } from '../../utils/path';
import ChannelChat from '../chat/ChannelChat';
import { Connector } from '../chat/Connector';
import { useHeartbeat } from '../chat/Heartbeat';
import Home from '../chat/Home';
import MemberDialog from '../chat/MemberDialog';
import Sidebar from '../chat/Sidebar';
import { RenderError } from '../molecules/RenderError';
import BasePage from '../templates/BasePage';
import NotFound from './NotFound';

const containerClassName = 'grid h-full grid-rows-[3rem_1fr_auto]';

const defaultSplitClassName =
  "grid-cols-[auto_1fr_1fr] [grid-template-areas:'sidebar-header_header'_'sidebar-body_list'_'sidebar-body_compose']";

const splitClassNames: Record<number, string> = {
  0: "grid-cols-[auto_1fr] [grid-template-areas:'sidebar-header_header'_'sidebar-body_list'_'sidebar-body_compose']",
  1: "grid-cols-[auto_1fr] [grid-template-areas:'sidebar-header_header'_'sidebar-body_list'_'sidebar-body_compose']",
  2: "grid-cols-[auto_1fr_1fr] [grid-template-areas:'sidebar-header_header_header'_'sidebar-body_list_list'_'sidebar-body_compose_compose']",
  3: "grid-cols-[auto_1fr_1fr_1fr] [grid-template-areas:'sidebar-header_header_header_header'_'sidebar-body_list_list_list'_'sidebar-body_compose_compose_compose']",
  4: "grid-cols-[auto_1fr_1fr_1fr_1fr] [grid-template-areas:'sidebar-header_header_header_header_header'_'sidebar-body_list_list_list_list'_'sidebar-body_compose_compose_compose_compose']",
  5: "grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] [grid-template-areas:'sidebar-header_header_header_header_header_header'_'sidebar-body_list_list_list_list_list'_'sidebar-body_compose_compose_compose_compose_compose']",
};

function ChatViewStyle() {
  useLayoutEffect(() => {
    document.documentElement.classList.add('legacy-chat-view');
    return () => document.documentElement.classList.remove('legacy-chat-view');
  }, []);
  return null;
}

function useLoadSpace(spaceId: Id) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadSpace(spaceId));
  }, [spaceId, dispatch]);
}

function ChatRender({ channelId, spaceId }: { channelId: Id | undefined; spaceId: Id }) {
  const [userDialog, setUserDialog] = useAtom(userDialogAtom);
  const prevChannelId = useRef<typeof channelId>(channelId);
  const myId: Id | undefined = useMyId();
  const navigate = useNavigate();
  const [focused, setFocused] = useState(0);
  const [paneList, setPaneList] = useState<Id[]>(channelId ? [channelId] : []);
  useLoadSpace(spaceId);
  useHeartbeat();
  // Panes follow the URL but can't be derived from it: splits are local state.
  /* eslint-disable @eslint-react/set-state-in-effect */
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
  /* eslint-enable @eslint-react/set-state-in-effect */
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
    navigate(`/space/${spaceId}`, { replace: true });
  }
  return (
    <div
      className={cls(containerClassName, splitClassNames[paneList.length] ?? defaultSplitClassName)}
      data-split={paneList.length}
    >
      <Connector key={spaceId} spaceId={spaceId} myId={myId} />
      <ChatViewStyle />
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
              // Panes may share a channel id (split duplicates it), so position is the key.
              // eslint-disable-next-line @eslint-react/no-array-index-key
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
    </div>
  );
}

function Chat() {
  const { channelId: encodedChannelId, spaceId: encodedSpaceId } = useParams();
  const spaceId = encodedSpaceId && isUuid(encodedSpaceId) ? encodedSpaceId : undefined;
  const channelId = encodedChannelId && isUuid(encodedChannelId) ? encodedChannelId : undefined;

  if (!spaceId || (encodedChannelId && !channelId)) {
    return (
      <BasePage>
        <NotFound />
      </BasePage>
    );
  }
  return <ChatRender spaceId={spaceId} channelId={channelId} />;
}

export default Chat;
