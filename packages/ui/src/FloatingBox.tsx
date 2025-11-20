import clsx from 'clsx';
import React, { type HTMLAttributes, type ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export const FloatingBox = function FloatingBox({ children, ref, className, ...props }: Props) {
  return (
    <div
      {...props}
      className={clsx(
        'FloatingBox',
        'bg-surface-unit border-border-black rounded-sm border text-sm shadow',
        className,
      )}
      ref={ref}
    >
      {children}
    </div>
  );
};

FloatingBox.displayName = 'FloatingBox';
