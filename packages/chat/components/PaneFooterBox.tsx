import type { FC } from 'react';
import type { ChildrenProps } from 'utils';

export const PaneFooterBox: FC<ChildrenProps> = ({ children }) => (
  <div className="bg-pane-bg sticky bottom-0 flex justify-end gap-2 border-t p-4">{children}</div>
);
