import type { FC } from 'react';
import { type ChildrenProps } from '@boluo/types';

export const PaneFooterBox: FC<ChildrenProps> = ({ children }) => (
  <div className="PaneFooterBox bg-pane-bg px-pane border-border-subtle sticky bottom-0 flex justify-end gap-2 border-t py-4">
    {children}
  </div>
);
