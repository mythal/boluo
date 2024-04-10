import clsx from 'clsx';
import { ChevronDown } from '@boluo/icons';
import React from 'react';
import type { DataAttr } from '@boluo/utils';

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> &
  DataAttr<{
    small?: boolean;
    type?: 'primary' | 'default' | 'switch' | 'danger' | 'detail';
    active?: boolean;
    on?: boolean;
  }>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, className, ...props }, ref) => {
  const isSmall = props['data-small'] ?? false;
  const type = props['data-type'] ?? 'default';
  return (
    <button
      className={clsx(
        'enabled:cursor-pointer disabled:cursor-not-allowed',
        'select-none appearance-none focus-visible:outline-none',
        'inline-flex items-center justify-center focus:ring',
        'm-0 gap-1 rounded-sm',
        isSmall ? 'min-h-[1.75rem] px-[0.75rem] py-0.5 text-sm' : 'text-baese px-4 py-2',
        (type === 'default' || type === 'detail') && [
          'bg-button-default-bg text-button-default-text',
          'hover:enabled:bg-button-default-hover-bg active-enabled:bg-button-default-active-bg',
          'disabled:text-button-default-disabled-text disabled:bg-button-default-disabled-bg',
        ],
        type === 'danger' &&
          'bg-button-danger-bg text-button-danger-text hover:enabled:bg-button-danger-hover-bg active-enabled:bg-button-danger-active-bg',
        type === 'primary' && [
          'bg-button-primary-bg text-button-primary-text',
          'hover:enabled:bg-button-primary-hover-bg active-enabled:bg-button-primary-active-bg',
          'disabled:bg-button-primary-disabled-bg disabled:text-button-primary-text',
        ],
        type === 'switch' && [
          'bg-button-switch-bg text-button-switch-text',
          'hover:enabled:bg-button-switch-hover-bg active-enabled:bg-button-switch-active-bg',
          'border-r-1 border-r-button-switch-off-hint',
          'on:border-r-button-switch-on-hint on:bg-button-switch-on-bg on:hover:enabled:to-button-switch-bg',
          'disabled:text-button-switch-disabled-text disabled:bg-button-switch-disabled-bg',
        ],
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
      {type === 'detail' && (
        <span
          data-on={props['data-on']}
          className="duration-1500 text-button-switch-detail-icon on:rotate-180 transform transition-transform data-[on=true]:rotate-180"
        >
          <ChevronDown />
        </span>
      )}
    </button>
  );
});
Button.displayName = 'Button';
