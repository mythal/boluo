import React from 'react';
import { cls } from '../../classname';
import { BarsIcon } from '../icons';
import Icon from '../Icon';

interface Props {
  onClick: () => void;
  expand: boolean;
  text: string;
  iconName: string;
}

export const SidebarButton = React.memo<Props>(({ onClick, expand, text, iconName }) => {
  return (
    <button
      className={cls(
        'w-full text-lg focus:outline-none py-1 px-2 hover:text-white',
        expand ? 'text-white border-l-4 border-white flex items-center justify-between' : 'text-gray-500'
      )}
      onClick={onClick}
    >
      <span className={cls(expand ? 'text-sm m-1' : 'hidden')}>{text}</span>
      <Icon name={iconName} />
    </button>
  );
});
