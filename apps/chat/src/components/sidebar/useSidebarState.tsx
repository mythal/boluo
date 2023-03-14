import { createContext, useContext } from 'react';

export interface SidebarState {
  isExpanded: boolean;
}

export const SidebarStateContext = createContext<SidebarState>({
  isExpanded: true,
});

export const useSidebarState = (): SidebarState => {
  return useContext(SidebarStateContext);
};
