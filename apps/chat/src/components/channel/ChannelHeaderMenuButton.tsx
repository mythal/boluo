import { ChevronDown, Menu } from 'icons';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import { Button } from 'ui';

interface Props {
  on: boolean;
  toggle: () => void;
}

export const ChannelHeaderMoreButton: FC<Props> = ({ on, toggle }) => {
  return (
    <Button data-small onClick={toggle} data-active={on}>
      <Menu />
      <span className="hidden @4xl:inline-flex gap-1 items-center">
        <ChevronDown
          data-on={on}
          className="data-[on=true]:rotate-180 transition-transform duration-200 text-surface-500 data-[on=true]:text-surface-600"
        />
      </span>
    </Button>
  );
};
