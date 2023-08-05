import { useAtomValue } from 'jotai';
import { FC, useEffect } from 'react';
import { Suspense } from 'react';
import { Loading } from 'ui/Loading';
import { useAutoSelectProxy } from '../hooks/useAutoSelectProxy';
import { useConnectionEffect } from '../hooks/useConnectionEffect';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { routeAtom } from '../state/view.atoms';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import { ChatNotFound } from './ChatNotFound';
import { ChatRoot } from './ChatRoot';
import { ChatSkeleton } from './ChatSkeleton';
import { ErrorDisplay } from './ErrorDisplay';
import { SpaceChatView } from './SpaceChatView';

const SpaceChat: FC<{
  spaceId: string;
}> = ({ spaceId }) => {
  const { data: space, error } = useQuerySpace(spaceId);
  if (error) return <ErrorDisplay error={error} />;
  if (!space) {
    return (
      <ChatSkeleton>
        <Loading />
      </ChatSkeleton>
    );
  }

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
