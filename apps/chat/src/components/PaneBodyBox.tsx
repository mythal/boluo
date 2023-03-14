import clsx from 'clsx';
import type { FC, ReactNode } from 'react';
import { useFocusPane, useIsFocused } from '../state/chat-view';

interface Props {
  children: ReactNode;
  className?: string;
}

export const PaneBodyBox: FC<Props> = ({ children, className }) => {
  const isFocused = useIsFocused();
  return (
    <div
      className={clsx(
        'bg-bg flex-grow',
        isFocused ? '' : 'max-md:hidden max-md:h-0',
        className,
      )}
    >
      {children}
    </div>
  );
};
