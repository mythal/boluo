import clsx from 'clsx';
import React, { FC, forwardRef, ReactNode } from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export const InListButton = forwardRef<HTMLButtonElement, Props>(({ children, active = false, ...props }, ref) => {
  return (
    <button
      ref={ref}
      {...props}
      className={clsx(
        'px-2 py-1 min-w-[2rem] border rounded group-hover:border-surface-200',
        'active-enabled:translate-y-px active-enable:border-surface-500 active-enabled:bg-surface-300',
        'inline-flex gap-1',
        active
          ? 'translate-y-px border-surface-500 bg-surface-300 hover:bg-surface-200 group-hover:border-surface-700'
          : 'group-hover:shadow-sm border-surface-100 hover:bg-surface-100 group-hover:border-surface-200',
      )}
    >
      {children}
    </button>
  );
});

InListButton.displayName = 'InListButton';
