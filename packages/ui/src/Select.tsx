import clsx from 'clsx';
import React from 'react';

type SelectProps = React.DetailedHTMLProps<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
>;

type Props = Exclude<SelectProps, 'className'> & {
  ref?: React.Ref<HTMLSelectElement>;
};

export const Select: React.FC<Props> = ({ children, ref, ...props }: Props) => {
  return (
    <select
      {...props}
      ref={ref}
      className={clsx(
        'Select select-bg-arrow border-border-default bg-surface-default text-text-primary relative w-full appearance-none rounded-sm border py-1 pr-8 pl-2',
        'hover:enabled:border-border-strong focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-[color:var(--color-border-focus)] focus-visible:outline-none',
      )}
    >
      {children}
    </select>
  );
};
