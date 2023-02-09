import { Hash, SplitHorizontal } from 'boluo-icons';
import { makeId } from 'boluo-utils';
import type { FC } from 'react';
import { useTransition } from 'react';
import { useIntl } from 'react-intl';
import { Button } from 'ui';
import { useChannel } from '../../../hooks/useChannel';
import { useChannelId } from '../../../hooks/useChannelId';
import { useChatPaneDispatch, usePaneId } from '../../../state/panes';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneHeaderBox } from '../PaneHeaderBox';

const SplitPaneButton: FC = () => {
  const channelId = useChannelId();
  const intl = useIntl();
  const paneId = usePaneId();
  const paneDispatch = useChatPaneDispatch();
  const [, starTransition] = useTransition();
  const dup = () =>
    starTransition(() =>
      paneDispatch({ type: 'ADD_PANE', insertAfter: paneId, item: { type: 'CHANNEL', id: makeId(), channelId } })
    );
  return (
    <Button
      data-small
      onClick={dup}
      title={intl.formatMessage({ defaultMessage: 'Split pane' })}
    >
      <SplitHorizontal className="rotate-90 md:rotate-0" />
    </Button>
  );
};

const ChannelName: FC = () => {
  const channelId = useChannelId();
  const channel = useChannel(channelId);
  return <span className="overflow-hidden whitespace-nowrap overflow-ellipsis">{channel.name}</span>;
};

export const ChannelHeader: FC = () => {
  return (
    <PaneHeaderBox
      icon={<Hash />}
      operators={
        <>
          <SplitPaneButton />
          <ClosePaneButton />
        </>
      }
    >
      <ChannelName />
    </PaneHeaderBox>
  );
};
