import { createContext, useContext } from 'react';

export const IsScrollingContext = createContext(false);

export const useIsScrolling = (): boolean => useContext(IsScrollingContext);
