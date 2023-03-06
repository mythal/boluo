import type { Channel } from 'api';
import { Hash } from 'icons';
import type { FC } from 'react';
import { makeId } from 'utils';
import { useChatPaneDispatch } from '../../state/chat-view';
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
