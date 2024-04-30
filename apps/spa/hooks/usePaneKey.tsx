import { useContext } from 'react';
import { PaneContext } from '../state/view.context';

export const usePaneKey = (): number | null => {
  return useContext(PaneContext).key;
};
