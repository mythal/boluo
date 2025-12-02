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
        'Select select-bg-arrow relative w-full cursor-pointer appearance-none rounded-sm border py-1 pr-8 pl-2',
        'border-action-secondary-border bg-action-secondary-bg hover:enabled:bg-action-secondary-bg-hover',
        'shadow-action-secondary-border pressed:shadow-[0_1px_0_0_inset] shadow-[0_-1px_0_0_inset]',
        'focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-(--color-border-focus) focus-visible:outline-none',
      )}
    >
      {children}
    </select>
  );
};
