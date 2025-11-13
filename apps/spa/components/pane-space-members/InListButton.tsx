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
        'group-hover:border-border-strong border-border-default min-w-[2rem] rounded-sm border px-2 py-1',
        'active-enabled:translate-y-px active-enable:border-border-strong active-enabled:bg-action-toggle-selected-bg',
        'inline-flex gap-1',
        active
          ? 'border-border-strong bg-action-toggle-selected-bg hover:bg-surface-interactive-active group-hover:border-border-strong translate-y-px'
          : 'border-border-subtle hover:bg-surface-muted group-hover:border-border-default',
      )}
    >
      {children}
    </button>
  );
};
