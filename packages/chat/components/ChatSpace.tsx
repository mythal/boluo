import { AlertTriangle } from 'icons';
import { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useConnectionEffect } from '../hooks/useConnectionEffect';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { SpaceContext } from '../hooks/useSpace';
import { ChatView } from './ChatView';
import { ErrorDisplay } from './ErrorDisplay';
import { PaneSpace } from './pane-space/PaneSpace';
import { PaneLoading } from './PaneLoading';

interface Props {
  spaceId: string;
}

export const ChatSpace: FC<Props> = ({ spaceId }) => {
  useConnectionEffect(spaceId);
  const { data: space, error } = useQuerySpace(spaceId);
  const defaultPane = useMemo(() => <PaneSpace spaceId={spaceId} />, [spaceId]);
  if (error) {
    if (error.code === 'NO_PERMISSION') {
      return (
        <div className="p-4">
          <div className="flex items-center gap-2 py-2 text-xl">
            <AlertTriangle className="inline" />
            <FormattedMessage defaultMessage="You do not have permission to view this space." />
          </div>
        </div>
      );
    }
    return (
      <div className="p-4">
        <ErrorDisplay error={error} />
      </div>
    );
  }
  if (!space) {
    return <PaneLoading />;
  }

  return (
    <SpaceContext.Provider value={space}>
      <ChatView defaultPane={defaultPane} />
    </SpaceContext.Provider>
  );
};
