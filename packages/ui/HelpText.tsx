import type { FC } from 'react';
import type { ChildrenProps } from './types';

export const HelpText: FC<ChildrenProps> = ({ children }) => <div className="text-sm text-surface-600">{children}</div>;
