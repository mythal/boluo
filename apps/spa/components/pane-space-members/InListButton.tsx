import clsx from 'clsx';
import React, { type ReactNode } from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

export const InListButton = ({ children, active = false, ref, ...props }: Props) => {
  return (
    <button
      ref={ref}
      {...props}
      className={clsx(
        'group-hover:border-surface-500 min-w-[2rem] rounded-sm border px-2 py-1',
        'active-enabled:translate-y-px active-enable:border-surface-800 active-enabled:bg-surface-300',
        'inline-flex gap-1',
        active
          ? 'border-surface-500 bg-surface-300 hover:bg-surface-200 group-hover:border-surface-700 translate-y-px'
          : 'border-surface-100 hover:bg-surface-100 group-hover:border-surface-200',
      )}
    >
      {children}
    </button>
  );
};
