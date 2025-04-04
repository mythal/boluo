import React from 'react';
import { Delay } from '../Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import clsx from 'clsx';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  interactive?: boolean;
  pressed?: boolean;
  ref?: React.Ref<HTMLSpanElement>;
}

export const NameBox = ({
  children,
  color,
  icon = null,
  interactive = false,
  pressed,
  ref,
  ...props
}: Props) => {
  return (
    <span
      ref={ref}
      role={interactive ? 'button' : undefined}
      aria-pressed={pressed}
      className={clsx(
        '@xl:w-[10rem] @2xl:w-[12rem] bg-name-bg aria-[pressed=true]:bg-name-editable-hover relative mr-1 w-[8rem] flex-none break-all rounded-sm font-bold',
        interactive && 'hover:bg-name-editable-hover cursor-pointer select-text',
      )}
      {...props}
    >
      <span className="mx-1" style={{ color }}>
        {children}
      </span>
      {icon && <Delay fallback={<FallbackIcon />}>{icon}</Delay>}
    </span>
  );
};
