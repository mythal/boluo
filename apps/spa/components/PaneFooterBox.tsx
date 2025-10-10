import type { FC } from 'react';
import { type ChildrenProps } from '@boluo/utils/types';

export const PaneFooterBox: FC<ChildrenProps> = ({ children }) => (
  <div className="bg-pane-bg px-pane sticky bottom-0 flex justify-end gap-2 border-t py-4">
    {children}
  </div>
);
