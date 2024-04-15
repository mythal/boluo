import { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useConnectionEffect } from '../hooks/useConnectionEffect';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { SpaceContext } from '../hooks/useSpace';
import { ChatView } from './ChatView';
import { PaneSpace } from './pane-space/PaneSpace';
import { PaneLoading } from './PaneLoading';
import { FailedBanner } from './common/FailedBanner';
import { Failed } from './common/Failed';

interface Props {
  spaceId: string;
}

export const ChatSpace: FC<Props> = ({ spaceId }) => {
  useConnectionEffect(spaceId);

  const { data: space, error } = useQuerySpace(spaceId);
  const defaultPane = useMemo(() => <PaneSpace spaceId={spaceId} />, [spaceId]);
  let errorNode = null;

  if (error) {
    const title = <FormattedMessage defaultMessage="Failed to query the space" />;
    if (error.code === 'NO_PERMISSION') {
      return (
        <Failed
          title={<FormattedMessage defaultMessage="No permission" />}
          message={<FormattedMessage defaultMessage="You do not have permission to view this space." />}
        />
      );
    } else if (!space) {
      return (
        <Failed
          title={title}
          message={<FormattedMessage defaultMessage="Please check your network connection and try again." />}
          error={error}
        />
      );
    }
    errorNode = <FailedBanner error={error}>{title}</FailedBanner>;
  }
  if (!space) {
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
