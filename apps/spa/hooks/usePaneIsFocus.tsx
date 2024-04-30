import { useContext } from 'react';
import { PaneContext } from '../state/view.context';

export const usePaneIsFocus = (): boolean => {
  return useContext(PaneContext).focused;
};
