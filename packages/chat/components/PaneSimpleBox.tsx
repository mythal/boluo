import type { FC } from 'react';
import type { ChildrenProps } from 'utils';

interface Props extends ChildrenProps {}

export const PaneSimpleBox: FC<Props> = ({ children }) => {
  return (
    <div className="bg-pane-bg flex flex-grow flex-col">
      <div className="h-pane-header border-b-1/2" />
      <div className="flex flex-grow items-center justify-center">{children}</div>
    </div>
  );
};
