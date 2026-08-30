import React from 'react';
import RotateCw from '@boluo/icons/legacy/RotateCw';
import { cls } from '../../utils/classnames';
import TextIcon from '../atoms/Icon';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export default function Loading({ className, text = 'loading', ...props }: Props) {
  return (
    <div
      className={cls(
        'font-legacy-mono animate-legacy-loading-pulse flex h-full w-full items-center justify-center py-2 text-[0.875rem] whitespace-pre',
        className,
      )}
      {...props}
    >
      <TextIcon className="me-1 text-[1.25rem]" icon={RotateCw} spin /> <span>{text}</span>
    </div>
  );
}
