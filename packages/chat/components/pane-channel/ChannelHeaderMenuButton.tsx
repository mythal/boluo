import { ChevronDown, Menu, Tool } from '@boluo/icons';
import { FC } from 'react';
import { Button } from '@boluo/ui/Button';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';

interface Props {
  on: boolean;
  toggle: () => void;
}

export const ChannelHeaderMoreButton: FC<Props> = ({ on, toggle }) => {
  return (
    <SidebarHeaderButton onClick={toggle} active={on}>
      <Tool />
    </SidebarHeaderButton>
  );
};
