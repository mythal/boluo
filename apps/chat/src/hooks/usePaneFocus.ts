import { useStore } from 'jotai';
import { useContext } from 'react';
import { focusPaneAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';

export const usePaneFocus = () => {
  const store = useStore();
  const { key } = useContext(PaneContext);
  return () => store.set(focusPaneAtom, key);
};
