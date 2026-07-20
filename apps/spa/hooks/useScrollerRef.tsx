import { use } from 'react';
import { createContext, type RefObject } from 'react';

export const ScrollerRefContext = createContext<RefObject<HTMLDivElement | null>>({
  current: null,
});

export const useScrollerRef = (): RefObject<HTMLDivElement | null> => use(ScrollerRefContext);
