import { type FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useConnectionEffect } from '../hooks/useConnectionEffect';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { SpaceContext } from '../hooks/useSpace';
import { PaneLoading } from './PaneLoading';
import { FailedBanner } from '@boluo/ui/chat/FailedBanner';
import { PaneFailed } from './pane-failed/PaneFailed';
import { PaneList } from './PaneList';
import { useTitle } from '../hooks/useTitle';
import { PaneSpaceGreeting } from './PaneSpaceGreeting';
import { useNotify } from '../hooks/useNotify';
import { useBannerNode } from '../hooks/useBannerNode';
import ReactDOM from 'react-dom';
import { useInitialChannelMessages } from '../hooks/useInitialChannelMessages';

interface Props {
  spaceId: string;
}

export const ChatSpace: FC<Props> = ({ spaceId }) => {
  useConnectionEffect(spaceId);
  useNotify(spaceId);
  useInitialChannelMessages(spaceId);

  const { data: space, error, isLoading } = useQuerySpace(spaceId);
  useTitle(spaceId, space);
  const banner = useBannerNode();

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
      errorNode = banner
        ? ReactDOM.createPortal(<FailedBanner error={error}>{title}</FailedBanner>, banner)
        : null;
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
      <PaneList defaultPane={defaultPane} />
    </SpaceContext>
  );
};
