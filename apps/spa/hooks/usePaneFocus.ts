import { useStore } from 'jotai';
import { type RefObject, useCallback, useContext } from 'react';
import { focusPaneAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';
import { useIsChildPane } from './useIsChildPane';

export const usePaneFocus = (ref: RefObject<HTMLDivElement | null>) => {
  const store = useStore();
  const { key } = useContext(PaneContext);
  const isChild = useIsChildPane();
  return useCallback(() => {
    if (key == null) {
      return;
    }
    store.set(focusPaneAtom, { key, isChild });
    const paneBox = ref.current;
    if (paneBox == null) return;
    paneBox.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [isChild, key, ref, store]);
};
