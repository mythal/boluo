import { useContext } from 'react';
import { createContext, RefObject } from 'react';

export const ScrollerRefContext = createContext<RefObject<HTMLDivElement | null>>({ current: null });

export const useScrollerRef = (): RefObject<HTMLDivElement | null> => useContext(ScrollerRefContext);
