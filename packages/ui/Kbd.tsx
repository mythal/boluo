import type { FC } from 'react';
import type { ChildrenProps } from 'utils';

export const Kbd: FC<ChildrenProps> = ({ children }) => (
  <kbd className="text-pin-highest bg-pin-lowest shadow-key mx-1 rounded-sm px-1 py-0.5 font-mono text-sm shadow-neutral-200">
    {children}
  </kbd>
);
