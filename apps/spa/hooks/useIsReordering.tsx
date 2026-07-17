import { createContext, use } from 'react';

export const IsReorderingContext = createContext(false);

export const useIsReordering = () => {
  return use(IsReorderingContext);
};
