import type { FC } from 'react';
import type { ChildrenProps } from 'utils';

export const HelpText: FC<ChildrenProps> = ({ children }) => <div className="text-surface-600 text-sm">{children}</div>;
