import type { FC } from 'react';
import type { ChildrenProps } from './types';

export const Kbd: FC<ChildrenProps> = ({ children }) => (
  <kbd className="font-mono px-1 py-0.5 mx-1 text-sm text-pin-highest bg-pin-lowest rounded-sm shadow-key shadow-neutral-200">
    {children}
  </kbd>
);
