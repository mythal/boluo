import type { FC } from 'react';
import type { ChildrenProps } from '@boluo/utils';

export const Kbd: FC<ChildrenProps> = ({ children }) => (
  <kbd className="text-pin-highest bg-pin-lowest mx-1 rounded-sm px-1 py-0.5 font-mono text-sm shadow-[0_1px_0_1px] shadow-neutral-200">
    {children}
  </kbd>
);
