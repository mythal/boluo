import { ChevronDown, Menu, Tool } from 'icons';
import { FC } from 'react';
import { Button } from 'ui/Button';

interface Props {
  on: boolean;
  toggle: () => void;
}

export const ChannelHeaderMoreButton: FC<Props> = ({ on, toggle }) => {
  return (
    <Button data-small onClick={toggle} data-active={on} data-on={on} data-type="detail">
      <Tool />
    </Button>
  );
};
