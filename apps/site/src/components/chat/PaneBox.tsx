import type { FC } from 'react';
import type { ChildrenProps } from '../../helper/props';

interface Props extends ChildrenProps {
}

export const PaneBox: FC<Props> = ({ children }) => {
  return (
    <>
      <div className="bg-bg border-b" />
      <div className="bg-bg flex items-center justify-center text-surface-400">{children}</div>
    </>
  );
};
