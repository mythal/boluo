import clsx from 'clsx';
import React from 'react';
import type { DataAttr } from './types';

export type ButtonProps =
  & React.ComponentPropsWithoutRef<'button'>
  & DataAttr<{
    small?: boolean;
    type?: 'primary' | 'default' | 'switch' | 'danger';
    active?: boolean;
    on?: boolean;
  }>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, className, ...props }, ref) => {
  const isSmall = props['data-small'] ?? false;
  const type = props['data-type'] ?? 'default';
  return (
    <button
      className={clsx(
        'disabled:cursor-not-allowed enabled:cursor-pointer',
        'select-none appearance-none focus-visible:outline-none',
        'inline-flex items-center justify-center focus:ring',
        'm-0 gap-1 rounded-sm px-4 py-2 text-baese',
        isSmall && 'min-h-[1.75rem] py-0.5 px-[0.75rem] text-sm',
        type === 'default' && [
          'bg-surface-300 text-highest',
          'hover-enabled:bg-surface-200 active-enabled:bg-surface-400',
          'disabled:text-surface-600 disabled:bg-surface-400',
        ],
        type === 'danger' && [
          'bg-error-600 text-lowest',
          'hover-enabled:bg-error-500 active-enabled:bg-error-400',
        ],
        type === 'primary' && [
          'bg-pin-brand-600 text-white',
          'hover-enabled:bg-pin-brand-500 active-enabled:bg-pin-brand-700',
          'disabled:bg-brand-700 disabled:text-surface-300',
        ],
        type === 'switch' && [
          'bg-surface-300 text-highest',
          'hover-enabled:bg-surface-200 active-enabled:bg-surface-500',
          'border-r-1 border-r-surface-400',
          'on:border-r-brand-400 on:bg-surface-400 on:hover-enabled:bg-surface-400',
          'disabled:text-surface-600 disabled:bg-surface-500',
        ],
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';
