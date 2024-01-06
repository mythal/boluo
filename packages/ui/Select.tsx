import clsx from 'clsx';
import type { FC } from 'react';

type SelectProps = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;

type Props = Exclude<SelectProps, 'className'>;

export const Select: FC<Props> = ({ children, ...props }) => {
  return (
    <select
      {...props}
      className={clsx(
        'bg-surface-200 w-full px-1.5 py-1.5 shadow-sm',
        'border-surface-100 hover:border-surface-400 rounded-sm border',
        'focus-visible:border-brand-500 focus-visible:outline-none',
      )}
    >
      {children}
    </select>
  );
};
