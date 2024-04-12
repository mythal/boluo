import React from 'react';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import clsx from 'clsx';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  interactive?: boolean;
  pressed?: boolean;
}

export const NameBox = React.forwardRef<HTMLSpanElement, Props>(
  ({ children, color, icon = null, interactive = false, pressed, ...props }, ref) => {
    return (
      <span
        ref={ref}
        role={interactive ? 'button' : undefined}
        aria-pressed={pressed}
        className={clsx(
          '@xl:w-[10rem] @2xl:w-[12rem] bg-name-bg aria-[pressed=true]:bg-name-editable-hover relative mr-1 w-[8rem] flex-none break-all rounded-sm font-bold',
          interactive && 'hover:bg-name-editable-hover cursor-pointer select-none',
        )}
        {...props}
      >
        <span className="mx-1" style={{ color }}>
          {children}
        </span>
        {icon && <Delay fallback={<FallbackIcon />}>{icon}</Delay>}
      </span>
    );
  },
);

NameBox.displayName = 'NameBox';
