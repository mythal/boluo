import { useStore } from 'jotai';
import { useCallback, useContext } from 'react';
import { focusPaneAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';

export const usePaneFocus = () => {
  const store = useStore();
  const { key } = useContext(PaneContext);
  return useCallback(() => {
    if (key) {
      store.set(focusPaneAtom, key);
    }
  }, [key, store]);
};
