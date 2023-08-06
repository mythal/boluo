import clsx from 'clsx';
import React from 'react';
import { FC, MouseEventHandler, ReactNode } from 'react';

interface Props extends React.HTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  isLoading?: boolean;
}

export const SidebarHeaderButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ icon, children, className, onClick, isLoading = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        onClick={isLoading ? undefined : onClick}
        className={clsx(
          'hover:bg-surface-200/75 active:bg-surface-200 rounded px-1.5 py-1.5 text-sm inline-flex gap-1 items-center',
          isLoading ? 'animate-pulse cursor-wait' : 'cursor-pointer',
        )}
        {...props}
      >
        {icon && <span>{icon}</span>}
        {children}
      </button>
    );
  },
);

SidebarHeaderButton.displayName = 'SidebarHeaderButton';
