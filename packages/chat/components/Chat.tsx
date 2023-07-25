import { useAtomValue } from 'jotai';
import { FC, useEffect } from 'react';
import { Suspense } from 'react';
import { Loading } from 'ui/Loading';
import { useAutoSelectProxy } from '../hooks/useAutoSelectProxy';
import { useConnectionEffect } from '../hooks/useConnectionEffect';
import { useSpace } from '../hooks/useSpace';
import { routeAtom } from '../state/view.atoms';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { ChatNotFound } from './ChatNotFound';
import { ChatRoot } from './ChatRoot';
import { ChatSkeleton } from './ChatSkeleton';
import { SpaceChatView } from './SpaceChatView';

const SpaceChat: FC<{
  spaceId: string;
}> = ({ spaceId }) => {
  const space = useSpace(spaceId);

  return <SpaceChatView space={space} />;
};

const Chat: FC = () => {
  const route = useAtomValue(routeAtom);
  useAutoSelectProxy(60 * 1000);
  useConnectionEffect();

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
        {route.type === 'SPACE' && <SpaceChat spaceId={route.spaceId} />}
        {route.type === 'NOT_FOUND' && <ChatNotFound />}
        {route.type === 'ROOT' && <ChatRoot />}
      </Suspense>
    </ChatErrorBoundary>
  );
};

// To facilitate lazy loading, use the default export
export default Chat;
