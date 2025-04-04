import { type FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useConnectionEffect } from '../hooks/useConnectionEffect';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { SpaceContext } from '../hooks/useSpace';
import { PaneLoading } from './PaneLoading';
import { FailedBanner } from './common/FailedBanner';
import { PaneFailed } from './pane-failed/PaneFailed';
import { useQueryConnectionToken } from '../hooks/useQueryConnectionToken';
import { ChatView } from './ChatView';
import { useTitle } from '../hooks/useTitle';
import { PaneSpaceGreeting } from './PaneSpaceGreeting';
import { useNotify } from '../hooks/useNotify';

interface Props {
  spaceId: string;
}

export const ChatSpace: FC<Props> = ({ spaceId }) => {
  const { data: token, isLoading: isTokenLoading } = useQueryConnectionToken();
  useConnectionEffect(spaceId, isTokenLoading, token?.token);
  useNotify(spaceId);

  const { data: space, error, isLoading } = useQuerySpace(spaceId);
  useTitle(spaceId, space);

  let defaultPane = useMemo(() => <PaneSpaceGreeting spaceId={spaceId} />, [spaceId]);
  let errorNode = null;

  if (error) {
    const title = <FormattedMessage defaultMessage="Failed to query the space" />;
    if (error.code === 'NO_PERMISSION') {
      defaultPane = (
        <PaneFailed
          title={<FormattedMessage defaultMessage="No permission" />}
          message={
            <FormattedMessage defaultMessage="You do not have permission to view this space." />
          }
        />
      );
    } else if (!space) {
      defaultPane = (
        <PaneFailed
          title={title}
          message={
            <FormattedMessage defaultMessage="Please check your network connection and try again." />
          }
          code={error.code}
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
    <SpaceContext value={space}>
      {errorNode}
      <ChatView defaultPane={defaultPane} />
    </SpaceContext>
  );
};
