import type { Channel } from 'api';
import { Hash } from 'icons';
import type { FC } from 'react';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { SidebarItem } from './SidebarItem';

interface Props {
  channel: Channel;
  active: boolean;
}

export const SidebarChannelItem: FC<Props> = ({ channel, active }) => {
  const replacePane = usePaneReplace();
  const handleClick = () => {
    replacePane({ type: 'CHANNEL', channelId: channel.id }, (pane) => pane.type === 'CHANNEL');
  };

  return (
    <SidebarItem onClick={handleClick} icon={<Hash />} active={active}>
      {channel.name}
    </SidebarItem>
  );
};
