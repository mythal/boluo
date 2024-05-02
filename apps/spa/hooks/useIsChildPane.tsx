import { createContext, useContext } from 'react';

export const IsChildPaneContext = createContext(false);

export const useIsChildPane = () => {
  return useContext(IsChildPaneContext);
};
