import clsx from 'clsx';
import { FC } from 'react';
import { ChildrenProps, StyleProps } from 'utils';
import { useFocusPane, useIsFocused } from '../state/chat-view';

interface Props extends ChildrenProps, StyleProps {
}

export const PaneBox: FC<Props> = ({ className, children }) => {
  const isFocused = useIsFocused();
  const focus = useFocusPane();
  return (
    <div
      onClick={focus}
      className={clsx(
        '@container min-w-[18rem] flex-[1_1_100%] flex flex-col h-full',
        isFocused ? 'max-md:flex-[1_1_100%]' : 'max-md:flex-[0_1_0%]',
        className,
      )}
    >
      {children}
    </div>
  );
};
