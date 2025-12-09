import clsx from 'clsx';
import type { FC } from 'react';
import { type ChildrenProps, type StyleProps } from '@boluo/types';

interface Props extends StyleProps, ChildrenProps {
  size?: 'small' | 'normal';
}

export const Text: FC<Props> = ({ children, size = 'normal', className }) => (
  <p
    className={clsx(
      size === 'normal' && 'mx-0 my-2',
      size === 'small' && 'mx-0 my-1 text-sm',
      className,
    )}
    data-size={size}
  >
    {children}
  </p>
);
