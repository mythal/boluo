import type { FC } from 'react';
import type { ChildrenProps } from '@boluo/utils';

export const Kbd: FC<ChildrenProps> = ({ children }) => (
  <kbd className="text-kbd-text bg-kbd-bg shadow-kbd-shadow rounded-sm px-1 py-0.5 font-mono text-sm shadow-[0_1px_0_2px]">
    {children}
  </kbd>
);
