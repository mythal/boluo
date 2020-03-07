import React from 'react';
import { cls } from '../../classname';
import { BarsIcon } from '../icons';

interface Props {
  toggle: () => void;
  expand: boolean;
}

export const ToggleButton = React.memo<Props>(({ toggle, expand }) => {
  return (
    <button className={cls('sidebar-btn', { 'sidebar-btn-down': expand })} onClick={toggle}>
      <BarsIcon />
    </button>
  );
});
