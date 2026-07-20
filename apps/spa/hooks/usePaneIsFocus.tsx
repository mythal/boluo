import { use } from 'react';
import { PaneContext } from '../state/view.context';

export const usePaneIsFocus = (): boolean => {
  return use(PaneContext).focused;
};
