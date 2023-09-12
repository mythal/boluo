import clsx from 'clsx';
import React from 'react';
import { FC, MouseEventHandler, ReactNode } from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  isLoading?: boolean;
  active?: boolean;
}

export const SidebarHeaderButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ icon, children, className, onClick, active, isLoading = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        onClick={isLoading ? undefined : onClick}
        className={clsx(
          'hover:bg-surface-200/75  rounded-sm px-1.5 py-1.5 text-sm inline-flex gap-1 items-center',
          'active:bg-surface-200',
          active && 'bg-surface-200',
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
