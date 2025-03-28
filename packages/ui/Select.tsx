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
        'Select bg-select-bg select-bg-arrow relative w-full appearance-none py-1 pl-2 pr-8',
        'border-select-border hover:border-select-hover-border rounded-sm border',
        'focus-visible:border-select-open-border focus-visible:outline-none',
      )}
    >
      {children}
    </select>
  );
};
