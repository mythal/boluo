import { createContext, use } from 'react';

export const IsOptimisticContext = createContext(false);

export const useIsOptimistic = () => {
  return use(IsOptimisticContext);
};
