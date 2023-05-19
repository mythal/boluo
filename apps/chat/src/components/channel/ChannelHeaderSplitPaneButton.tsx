import { SplitHorizontal } from 'icons';
import { FC, useTransition } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui';
import { makeId } from 'utils';
import { useChannelId } from '../../hooks/useChannelId';
import { useChatPaneDispatch, usePaneId } from '../../state/chat-view';

export const ChannelHeaderSplitPaneButton: FC = () => {
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
