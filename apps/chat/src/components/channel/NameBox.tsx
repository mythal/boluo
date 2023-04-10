import clsx from 'clsx';
import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export const NameBox: FC<Props> = ({ children, className }) => (
  <div className={clsx('flex-none w-[8rem] @xl:w-[10rem] @2xl:w-[12rem] text-right', className)}>{children}</div>
);
