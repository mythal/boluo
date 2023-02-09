import clsx from 'clsx';
import type { FC, ReactNode } from 'react';
import { useFocusPane, useIsFocused } from '../../state/panes';

interface Props {
  children: ReactNode;
  className?: string;
}

export const PaneBodyBox: FC<Props> = ({ children, className }) => {
  const isFocused = useIsFocused();
  const focus = useFocusPane();
  return (
    <div
      className={clsx('bg-bg', isFocused && `pane-focused`, `max-md:[&:not(.pane-focused)]:hidden`, className)}
      onClick={focus}
    >
      {children}
    </div>
  );
};
