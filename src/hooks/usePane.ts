import React, { useContext } from 'react';

export const PaneContext = React.createContext(0);

export function usePane(): number {
  return useContext(PaneContext);
}
