import React from 'react';
import { cls } from '../../utils/classnames';

export interface Props {
  className?: string;
  children: React.ReactNode;
  position?: 'bottom' | 'top';
  x?: 'left' | 'right';
}

export function ItemToolbar({ children, className, position = 'top', x = 'right' }: Props) {
  return (
    <div
      className={cls(
        'absolute top-0 right-1/2 z-20 w-max translate-x-1/2 -translate-y-[65%] px-4 py-2 data-[position=bottom]:top-auto data-[position=bottom]:bottom-0 data-[position=bottom]:translate-y-[80%] data-[x=left]:right-auto data-[x=left]:left-0',
        className,
      )}
      data-position={position}
      data-x={x}
    >
      <div className="shadow-legacy-ui w-max rounded-[3px] bg-[rgba(0,0,0,0.4)] px-1 py-1 backdrop-blur-[1px]">
        {children}
      </div>
    </div>
  );
}

export default ItemToolbar;
