import type { FC } from 'react';
import { Suspense } from 'react';
import { Loading } from 'ui';
import { useSpace } from '../../hooks/useSpace';
import { ChatViewState, PaneProvider, useChatViewState } from '../../state/chat-view';
import { ChatNotFound } from './ChatNotFound';
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

  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen">
          <Loading />
        </div>
      }
    >
      <PaneProvider dispatch={dispatch} focused={focused}>
        {route.type === 'SPACE' && <SpaceChat spaceId={route.spaceId} panes={panes} />}
        {route.type === 'NOT_FOUND' && <ChatNotFound />}
      </PaneProvider>
    </Suspense>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
