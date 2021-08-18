import React, { useContext } from 'react';
import { Id } from '../utils/id';

export const PaneContext = React.createContext<Id | undefined>(undefined);

export function usePane(): Id {
  const pane = useContext(PaneContext);
  if (pane === undefined) {
    throw new Error('use a uninitialized pane context');
  }
  return pane;
}
