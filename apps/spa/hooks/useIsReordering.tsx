import { createContext, useContext } from 'react';

export const IsReorderingContext = createContext(false);

export const useIsReordering = () => {
  return useContext(IsReorderingContext);
};
