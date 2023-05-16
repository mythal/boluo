import { FC, useEffect } from 'react';
import { Suspense } from 'react';
import { Loading } from 'ui';
import { useSpace } from '../hooks/useSpace';
import { ChatViewState, PaneProvider, useChatViewState } from '../state/chat-view';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { ChatNotFound } from './ChatNotFound';
import { ChatRoot } from './ChatRoot';
import { ChatSkeleton } from './ChatSkeleton';
import { SpaceChatView } from './SpaceChatView';

const SpaceChat: FC<{
  spaceId: string;
  panes: ChatViewState['panes'];
}> = ({ spaceId, panes }) => {
  const space = useSpace(spaceId);

  return <SpaceChatView space={space} panes={panes} />;
};

const Chat: FC = () => {
  const { panes, dispatch, focused, route } = useChatViewState();

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehaviorY = 'none';
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehaviorY = '';
    };
  }, []);

  return (
    <ChatErrorBoundary>
      <Suspense
        fallback={
          <ChatSkeleton>
            <Loading />
          </ChatSkeleton>
        }
      >
        <PaneProvider dispatch={dispatch} focused={focused}>
          {route.type === 'SPACE' && <SpaceChat spaceId={route.spaceId} panes={panes} />}
          {route.type === 'NOT_FOUND' && <ChatNotFound />}
          {route.type === 'ROOT' && <ChatRoot />}
        </PaneProvider>
      </Suspense>
    </ChatErrorBoundary>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
