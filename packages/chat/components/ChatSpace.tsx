import { FC, useMemo } from 'react';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { SpaceContext } from '../hooks/useSpace';
import { ChatView } from './ChatView';
import { ErrorDisplay } from './ErrorDisplay';
import { PaneLoading } from './PaneLoading';
import { PaneSpace } from './PaneSpace';

interface Props {
  spaceId: string;
}

export const ChatSpace: FC<Props> = ({ spaceId }) => {
  const { data: space, error } = useQuerySpace(spaceId);
  const defaultPane = useMemo(() => <PaneSpace spaceId={spaceId} />, [spaceId]);
  if (error) return <ErrorDisplay error={error} />;
  if (!space) {
    return <PaneLoading />;
  }

  return (
    <SpaceContext.Provider value={space}>
      <ChatView defaultPane={defaultPane} />
    </SpaceContext.Provider>
  );
};
