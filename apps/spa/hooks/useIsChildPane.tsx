import { createContext, use } from 'react';

export const IsChildPaneContext = createContext(false);

export const useIsChildPane = () => {
  return use(IsChildPaneContext);
};
