import clsx from 'clsx';
import React from 'react';

type SelectProps = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;

type Props = Exclude<SelectProps, 'className'>;

export const Select = React.forwardRef<HTMLSelectElement, Props>(({ children, ...props }, ref) => {
  return (
    <select
      {...props}
      ref={ref}
      className={clsx(
        'bg-select-bg select-bg-arrow relative w-full appearance-none px-2 py-1',
        'border-select-border hover:border-select-hover-border rounded-sm border',
        'focus-visible:border-select-open-border focus-visible:outline-none',
      )}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';
