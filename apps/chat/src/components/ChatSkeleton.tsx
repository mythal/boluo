import type { FC, ReactNode } from 'react';
import { PaneBox } from './PaneBox';

interface Props {
  children?: ReactNode;
  placeholder?: ReactNode;
}

export const ChatSkeleton: FC<Props> = ({ children, placeholder }) => {
  return (
    <div className="chat-grid">
      <div className="border-r border-b-1/2 border-b-gray-400"></div>
      <div className="border-r w-48"></div>
      <PaneBox>{children || <span className="text-surface-400">{placeholder}</span>}</PaneBox>
    </div>
  );
};
