import type { FC } from 'react';
import type { ChildrenProps } from '../../helper/props';

export const PaneFooterBox: FC<ChildrenProps> = ({ children }) => (
  <div className="p-4 sticky bottom-0 border-t bg-bg flex justify-end gap-2">{children}</div>
);
