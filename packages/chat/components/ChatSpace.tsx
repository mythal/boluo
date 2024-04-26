import { FC, useEffect, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useConnectionEffect } from '../hooks/useConnectionEffect';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { SpaceContext } from '../hooks/useSpace';
import { PaneSpace } from './pane-space/PaneSpace';
import { PaneLoading } from './PaneLoading';
import { FailedBanner } from './common/FailedBanner';
import { PaneFailed } from './pane-failed/PaneFailed';
import { useQueryConnectionToken } from '../hooks/useQueryConnectionToken';
import { ChatView } from './ChatView';
import { useTitle } from '../hooks/useTitle';

interface Props {
  spaceId: string;
}

export const ChatSpace: FC<Props> = ({ spaceId }) => {
  const { data: token, isLoading: isTokenLoading } = useQueryConnectionToken();
  useConnectionEffect(spaceId, isTokenLoading, token?.token);

  const { data: space, error, isLoading } = useQuerySpace(spaceId);
  useTitle(space);

  let defaultPane = useMemo(() => <PaneSpace spaceId={spaceId} />, [spaceId]);
  let errorNode = null;

  if (error) {
    const title = <FormattedMessage defaultMessage="Failed to query the space" />;
    if (error.code === 'NO_PERMISSION') {
      defaultPane = (
        <PaneFailed
          title={<FormattedMessage defaultMessage="No permission" />}
          message={<FormattedMessage defaultMessage="You do not have permission to view this space." />}
        />
      );
    } else if (!space) {
      defaultPane = (
        <PaneFailed
          title={title}
          message={<FormattedMessage defaultMessage="Please check your network connection and try again." />}
          error={error}
        />
      );
    } else {
      errorNode = <FailedBanner error={error}>{title}</FailedBanner>;
    }
  }
  if (!space && isLoading) {
    return (
      <>
        {errorNode}
        <PaneLoading />
      </>
    );
  }

  return (
    <SpaceContext.Provider value={space}>
      {errorNode}
      <ChatView defaultPane={defaultPane} />
    </SpaceContext.Provider>
  );
};
