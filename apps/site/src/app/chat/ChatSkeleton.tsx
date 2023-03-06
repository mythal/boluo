import { PaneBox } from 'chat/src/components/PaneBox';
import type { FC } from 'react';
import type { ChildrenProps } from 'utils';

export const ChatSkeleton: FC<Partial<ChildrenProps>> = ({ children }) => {
  return (
    <div className="chat-grid">
      <div className="border-r border-b-1/2 border-b-gray-400"></div>
      <div className="border-r w-48"></div>
      <PaneBox>{children}</PaneBox>
    </div>
  );
};
