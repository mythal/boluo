import { useMe } from 'common';
import { Hash, SplitHorizontal } from 'icons';
import type { FC } from 'react';
import { useTransition } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui';
import { makeId } from 'utils';
import { useChannel } from '../../hooks/useChannel';
import { useChannelId } from '../../hooks/useChannelId';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { useChatPaneDispatch, usePaneId } from '../../state/chat-view';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { ChannelHeaderMemberButton } from './ChannelHeaderMemberButton';

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
      <span className="hidden @4xl:inline">
        <FormattedMessage defaultMessage="Split" />
      </span>
    </Button>
  );
};

const ChannelName: FC<{ channelId: string }> = ({ channelId }) => {
  const channel = useChannel(channelId);
  return <span className="overflow-hidden whitespace-nowrap overflow-ellipsis">{channel.name}</span>;
};

export const ChannelHeader: FC = () => {
  const channelId = useChannelId();
  return (
    <PaneHeaderBox
      icon={<Hash />}
      operators={
        <>
          <ChannelHeaderMemberButton channelId={channelId} />
          <SplitPaneButton />
          <ClosePaneButton />
        </>
      }
    >
      <ChannelName channelId={channelId} />
    </PaneHeaderBox>
  );
};
