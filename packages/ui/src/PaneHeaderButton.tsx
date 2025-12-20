import clsx from 'clsx';
import React from 'react';
import { type ReactNode } from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  isLoading?: boolean;
  active?: boolean;
  size?: 'small' | 'medium';
  ref?: React.Ref<HTMLButtonElement>;
}

export const PaneHeaderButton = ({
  icon,
  children,
  className,
  onClick,
  active = false,
  isLoading = false,
  size = 'medium',
  ref,
  ...props
}: Props) => {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      onClick={isLoading ? undefined : onClick}
      aria-pressed={active}
      className={clsx(
        'PaneHeaderButton',
        'inline-flex items-center gap-1 rounded-sm px-2 py-2',
        'transition-shadow duration-100',
        active
          ? 'bg-action-secondary-bg-active text-action-toggle-text shadow-[0_2px_0_0px_rgba(0,0,0,0.25)_inset]'
          : 'hover:bg-surface-interactive-hover active:bg-surface-interactive-active',
        isLoading ? 'cursor-wait' : 'cursor-pointer',
        size === 'medium' ? 'text-sm' : '',
        size === 'small' ? 'text-xs' : '',
        className,
      )}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};
