import type { Channel } from 'api';
import { Hash } from 'icons';
import { useSetAtom } from 'jotai';
import type { FC } from 'react';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { panesAtom } from '../../state/view.atoms';
import { SidebarItem } from './SidebarItem';

interface Props {
  channel: Channel;
  active: boolean;
}

export const SidebarChannelItem: FC<Props> = ({ channel, active }) => {
  const replacePane = usePaneReplace();
  const setPane = useSetAtom(panesAtom);
  const addPane = usePaneAdd();
  const handleClick = () => {
    replacePane({ type: 'CHANNEL', channelId: channel.id }, (pane) => pane.type === 'CHANNEL');
  };
  const handleAdd = () => {
    addPane({ type: 'CHANNEL', channelId: channel.id });
  };
  const handleClose = active
    ? () => {
      setPane((panes) => panes.filter((pane) => pane.type !== 'CHANNEL' || pane.channelId !== channel.id));
    }
    : undefined;

  return (
    <SidebarItem
      onClick={handleClick}
      icon={<Hash />}
      active={active}
      onClose={handleClose}
      onAdd={handleAdd}
      varant="flat"
    >
      <span className="text-left break-all">
        {channel.name}
      </span>
    </SidebarItem>
  );
};
