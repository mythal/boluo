import type { Channel } from 'boluo-api';
import { Hash } from 'boluo-icons';
import { makeId } from 'boluo-utils';
import type { FC } from 'react';
import { useChatPaneDispatch } from '../../../state/panes';
import { SidebarItem } from './SidebarItem';

interface Props {
  channel: Channel;
  active: boolean;
}

export const SidebarChannelItem: FC<Props> = ({ channel, active }) => {
  const dispatch = useChatPaneDispatch();
  const replace = () => {
    dispatch({ type: 'REPLACE_PANE', item: { type: 'CHANNEL', id: makeId(), channelId: channel.id } });
  };

  return (
    <SidebarItem onClick={replace} icon={<Hash />} active={active}>
      {channel.name}
    </SidebarItem>
  );
};
