import clsx from 'clsx';
import type { FC } from 'react';

type SelectProps = React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;

type Props = Exclude<SelectProps, 'className'>;

export const Select: FC<Props> = ({ children, ...props }) => {
  return (
    <select
      {...props}
      className={clsx(
        'w-full px-1.5 py-1.5 bg-surface-200 shadow-sm',
        'border border-surface-100 hover:border-surface-400 rounded-sm',
        'focus-visible:outline-none focus-visible:border-brand-500',
      )}
    >
      {children}
    </select>
  );
};
