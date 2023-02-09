import clsx from 'clsx';
import type { FC } from 'react';
import type { ChildrenProps, StyleProps } from './types';

interface Props extends StyleProps, ChildrenProps {
  size?: 'small' | 'normal';
}

export const Text: FC<Props> = ({ children, size = 'normal', className }) => (
  <p
    className={clsx(size === 'normal' && 'my-2 mx-0', size === 'small' && 'my-1 mx-0 text-sm', className)}
    data-size={size}
  >
    {children}
  </p>
);
