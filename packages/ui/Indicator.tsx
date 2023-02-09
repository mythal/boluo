import clsx from 'clsx';
import type { FC } from 'react';

interface Props {
  on: boolean;
  className?: string;
}

export const Indicator: FC<Props> = ({ on, className }) => (
  <span
    className={clsx(
      'w-[0.5em] h-[0.5em] border-[0.125em] rounded-full box-content',
      on
        ? 'bg-brand-400 border-surface-600'
        : 'bg-surface-200 group-hover:bg-brand-100  border-surface-400',
      className,
    )}
    aria-hidden
  />
);
