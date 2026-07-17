import { createContext, use } from 'react';

export const IsScrollingContext = createContext(false);

export const useIsScrolling = (): boolean => use(IsScrollingContext);
