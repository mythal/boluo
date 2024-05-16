import { useStore } from 'jotai';
import { RefObject, useCallback, useContext } from 'react';
import { focusPaneAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';

export const usePaneFocus = (ref: RefObject<HTMLDivElement>) => {
  const store = useStore();
  const { key } = useContext(PaneContext);
  return useCallback(() => {
    if (key == null) {
      return;
    }
    store.set(focusPaneAtom, key);
    const paneBox = ref.current;
    if (paneBox == null) return;
    paneBox.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [key, ref, store]);
};
