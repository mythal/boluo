import React from 'react';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import clsx from 'clsx';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  editable?: boolean;
}

export const NameBox = React.forwardRef<HTMLSpanElement, Props>(
  ({ children, color, icon = null, editable = false, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          '@xl:w-[10rem] @2xl:w-[12rem] relative mr-1 w-[8rem] flex-none break-all font-bold',
          editable && 'cursor-pointer select-none',
        )}
        {...props}
      >
        <span className="mr-1" style={{ color }}>
          {children}
        </span>
        {icon && <Delay fallback={<FallbackIcon />}>{icon}</Delay>}
      </span>
    );
  },
);

NameBox.displayName = 'NameBox';
