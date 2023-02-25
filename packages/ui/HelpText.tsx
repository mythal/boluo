import type { FC } from 'react';
import type { ChildrenProps } from 'utils';

export const HelpText: FC<ChildrenProps> = ({ children }) => <div className="text-sm text-surface-600">{children}</div>;
