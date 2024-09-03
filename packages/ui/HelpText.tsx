import type { FC } from 'react';
import type { ChildrenProps } from '@boluo/utils';

export const HelpText: FC<ChildrenProps> = ({ children }) => <div className="text-text-light text-sm">{children}</div>;
