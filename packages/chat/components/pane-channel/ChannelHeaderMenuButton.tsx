import { ChevronDown, Menu, Tool } from 'icons';
import { FC } from 'react';
import { Button } from 'ui/Button';

interface Props {
  on: boolean;
  toggle: () => void;
}

export const ChannelHeaderMoreButton: FC<Props> = ({ on, toggle }) => {
  return (
    <Button data-small onClick={toggle} data-active={on}>
      <Tool />
      <span className="hidden @xl:inline-flex gap-1 items-center">
        <ChevronDown
          data-on={on}
          className="data-[on=true]:rotate-180 transition-transform duration-200 text-surface-500 data-[on=true]:text-surface-600"
        />
      </span>
    </Button>
  );
};
