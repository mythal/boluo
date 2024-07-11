import clsx from 'clsx';
import type { FC } from 'react';

interface Props {
  on: boolean;
  className?: string;
}

export const Indicator: FC<Props> = ({ on, className }) => (
  <span
    className={clsx(
      'box-content h-[0.5em] w-[0.5em] rounded-full border-[0.125em]',
      on ? 'bg-brand-400 border-surface-600' : 'bg-surface-200 group-hover:bg-brand-100 border-surface-400',
      className,
    )}
    aria-hidden
  />
);
