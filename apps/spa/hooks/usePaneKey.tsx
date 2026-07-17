import { use } from 'react';
import { PaneContext } from '../state/view.context';

export const usePaneKey = (): number | null => {
  return use(PaneContext).key;
};
