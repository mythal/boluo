import { createContext, useContext } from 'react';

export const IsOptimisticContext = createContext(false);

export const useIsOptimistic = () => {
  return useContext(IsOptimisticContext);
};
