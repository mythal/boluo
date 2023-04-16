import type { FC } from 'react';
import type { ChildrenProps } from 'utils';

interface Props extends ChildrenProps {
}

export const PaneSimpleBox: FC<Props> = ({ children }) => {
  return (
    <div className="flex-grow bg-bg flex flex-col">
      <div className="h-pane-header border-b-1/2" />
      <div className="flex-grow flex items-center justify-center">{children}</div>
    </div>
  );
};
