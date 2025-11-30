import clsx from 'clsx';
import React from 'react';

interface ExtendedButtonInlineProps {
  variant?: 'default';
  groupHover?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export type ButtonInlineProps = React.ComponentPropsWithoutRef<'button'> &
  ExtendedButtonInlineProps;

export const ButtonInline: React.FC<ButtonInlineProps> = function ButtonInline({
  children,
  className,
  groupHover,
  ref,
  ...props
}: ButtonInlineProps) {
  if (props.type == null) {
    props.type = 'button';
  }
  return (
    <button
      className={clsx(
        className,
        'ButtonInline inline-flex items-center justify-center rounded-sm px-[0.5em] py-0.5 transition-shadow duration-100',
        'text-text-primary',
        'bg-action-secondary-bg shadow-action-secondary-border ring-border-focus focus:ring',
        'border-action-secondary-border border border-b-2',
        'hover:bg-action-secondary-bg-hover',
        groupHover && 'group-hover:bg-action-secondary-bg-hover',
        'pressed:border-b pressed:bg-action-secondary-bg-active pressed:border-t-2',
        'cursor-pointer text-[80%]',
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
};
