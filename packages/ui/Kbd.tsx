import type { FC } from 'react';
import clsx from 'clsx';

interface Props {
  children: string;
  variant?: 'small' | 'normal';
}

export const Kbd: FC<Props> = ({ children, variant = 'normal' }) => (
  <kbd
    className={clsx(
      'Kbd text-kbd-text bg-kbd-bg shadow-kbd-shadow mx-[2px] rounded-sm font-mono font-normal shadow-[0_1px_0_2px]',
      variant === 'small' && 'px-0.5 py-px text-xs',
      variant === 'normal' && 'px-1 py-0.5 text-sm',
    )}
  >
    {children}
  </kbd>
);
