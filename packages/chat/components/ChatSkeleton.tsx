import type { FC, ReactNode } from 'react';
import { PaneSimpleBox } from './PaneSimpleBox';

interface Props {
  children?: ReactNode;
  placeholder?: ReactNode;
}

export const ChatSkeleton: FC<Props> = ({ children, placeholder }) => {
  return (
    <div className="flex">
      <div className="flex bg-lowest view-height flex-col flex-none">
        <div className="h-pane-header border-r "></div>
        <div className="border-r w-sidebar flex-grow"></div>
      </div>
      <PaneSimpleBox>{children || <span className="text-surface-400">{placeholder}</span>}</PaneSimpleBox>
    </div>
  );
};
