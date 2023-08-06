import { Bell, Plus } from 'icons';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';
import { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { useChannelList } from '../../hooks/useQueryChannelList';
import { useMySpaceMember } from '../../hooks/useQueryMySpaceMember';
import { panesAtom } from '../../state/view.atoms';
import { SidebarChannelItem } from './SidebarChannelItem';
import { SidebarItem } from './SidebarItem';
import { SidebarItemSkeleton } from './SidebarItemSkeleton';

interface Props {
  spaceId: string;
}

export const SidebarChannelList: FC<Props> = ({ spaceId }) => {
  const panes = useAtomValue(panesAtom);
  const { data: mySpaceMember } = useMySpaceMember(spaceId);
  const { data: channels } = useChannelList(spaceId);
  const channelIdFromPanes = useMemo(
    () => panes.flatMap((pane) => pane.type === 'CHANNEL' ? [pane.channelId] : []),
    [panes],
  );
  const togglePane = usePaneToggle();
  const toggleCreateChannelPane = () => {
    togglePane({ type: 'CREATE_CHANNEL', spaceId });
  };
  const isCreateChannelPaneOpened = useMemo(() => panes.find(pane => pane.type === 'CREATE_CHANNEL') !== undefined, [
    panes,
  ]);
  const intl = useIntl();
  const toggleNotification = intl.formatMessage({ defaultMessage: 'Toggle Notification' });
  return (
    <div>
      <div className="py-2 px-3 text-surface-600 flex justify-between items-center text-sm">
        <span>
          <FormattedMessage defaultMessage="Channels" />
        </span>
      </div>
      {channels == null && <SidebarItemSkeleton />}
      {channels?.map((channel) => (
        <SidebarChannelItem
          key={channel.id}
          channel={channel}
          active={channelIdFromPanes.includes(channel.id)}
        />
      ))}
      {mySpaceMember?.isAdmin && (
        <SidebarItem icon={<Plus />} toggle active={isCreateChannelPaneOpened} onClick={toggleCreateChannelPane}>
          <span className="text-surface-400 group-hover:text-surface-800">
            <FormattedMessage defaultMessage="Add New" />
          </span>
        </SidebarItem>
      )}
    </div>
  );
};
