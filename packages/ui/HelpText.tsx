import type { FC } from 'react';
import type { ChildrenProps } from '@boluo/utils';

export const HelpText: FC<ChildrenProps> = ({ children }) => (
  <div className="HelpText text-text-secondary text-sm">{children}</div>
);
