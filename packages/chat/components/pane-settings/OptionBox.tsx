import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

interface Props {
  className?: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const OptionBox: FC<Props> = ({ className, children, active = false, disabled = false, onClick }) => {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex w-full flex-col items-start gap-1.5 rounded-md px-4 py-2 text-left',
        'border-1/2 cursor-pointer',
        active ? 'border-brand-500 bg-brand-50 hover:bg-brand-100' : 'hover:border-surface-300  hover:bg-surface-100',
        className,
      )}
    >
      {children}
    </button>
  );
};
