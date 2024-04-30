import type { FC, ReactNode } from 'react';
import { PaneSimpleBox } from './PaneSimpleBox';

interface Props {
  children?: ReactNode;
  placeholder?: ReactNode;
}

export const ChatSkeleton: FC<Props> = ({ children, placeholder }) => {
  return (
    <div className="flex">
      <div className="bg-bg view-height flex flex-none flex-col">
        <div className="h-pane-header border-r "></div>
        <div className="w-sidebar flex-grow border-r"></div>
      </div>
      <PaneSimpleBox>{children || <span className="text-surface-400">{placeholder}</span>}</PaneSimpleBox>
    </div>
  );
};
