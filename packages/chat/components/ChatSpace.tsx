import { FC } from 'react';
import { Loading } from 'ui/Loading';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { SpaceContext } from '../hooks/useSpace';
import { ChatSkeleton } from './ChatSkeleton';
import { ChatView } from './ChatView';
import { ErrorDisplay } from './ErrorDisplay';

interface Props {
  spaceId: string;
}

export const ChatSpace: FC<Props> = ({ spaceId }) => {
  const { data: space, error } = useQuerySpace(spaceId);
  if (error) return <ErrorDisplay error={error} />;
  if (!space) {
    return (
      <ChatSkeleton>
        <Loading />
      </ChatSkeleton>
    );
  }

  return (
    <SpaceContext.Provider value={space}>
      <ChatView />
    </SpaceContext.Provider>
  );
};
