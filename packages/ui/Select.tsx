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
        'Select select-bg-arrow relative w-full appearance-none rounded-sm border border-border-default bg-surface-default py-1 pl-2 pr-8 text-text-primary',
        'hover:enabled:border-border-strong focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-border-focus)]',
      )}
    >
      {children}
    </select>
  );
};
