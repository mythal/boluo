import { Plus } from 'icons';
import type { FC } from 'react';
import { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui';
import { useChannelList } from '../../hooks/useChannelList';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane, Pane } from '../../types/chat-pane';
import { SidebarChannelItem } from './SidebarChannelItem';

interface Props {
  spaceId: string;
  panes: Pane[];
}

export const SidebarChannelList: FC<Props> = ({ spaceId, panes }) => {
  const channels = useChannelList(spaceId);
  const channelIdFromPanes = useMemo(
    () => panes.flatMap((pane) => pane.type === 'CHANNEL' ? [pane.channelId] : []),
    [panes],
  );
  const dispatch = useChatPaneDispatch();
  const handleOpenCreateChannelPane = () => {
    dispatch({ type: 'TOGGLE', pane: makePane({ type: 'CREATE_CHANNEL', spaceId }) });
  };
  const isCreateChannelPaneOpened = useMemo(() => panes.find(pane => pane.type === 'CREATE_CHANNEL') !== undefined, [
    panes,
  ]);
  const intl = useIntl();
  const createChannelLabel = intl.formatMessage({ defaultMessage: 'Create channel' });
  return (
    <div>
      <div className="py-2 px-4 text-surface-600 flex justify-between items-center text-sm">
        <span>
          <FormattedMessage defaultMessage="Channels" />
        </span>
        <div>
          <Button
            onClick={handleOpenCreateChannelPane}
            type="button"
            data-small
            data-type="switch"
            data-on={isCreateChannelPaneOpened}
            title={createChannelLabel}
            aria-label={createChannelLabel}
          >
            <Plus />
          </Button>
        </div>
      </div>
      {channels.map((channel) => (
        <SidebarChannelItem
          key={channel.id}
          channel={channel}
          active={channelIdFromPanes.includes(channel.id)}
        />
      ))}
    </div>
  );
};
