import type { FC } from 'react';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { useChannelList } from '../../../hooks/useChannelList';
import { useChatPaneDispatch } from '../../../state/panes';
import type { Pane } from '../../../types/ChatPane';
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
    dispatch({ type: 'TOGGLE', pane: { type: 'CREATE_CHANNEL', id: 'create_channel', spaceId } });
  };
  const isCreateChannelPaneOpened = useMemo(() => panes.find(pane => pane.type === 'CREATE_CHANNEL') !== undefined, [
    panes,
  ]);
  return (
    <>
      <div className="py-2 px-4 text-surface-600 flex justify-between items-center text-sm border-b border-surface-200">
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
          >
            +
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
    </>
  );
};
