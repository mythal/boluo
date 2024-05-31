import { useCallback, useContext } from 'react';
import { PaneContext } from '../state/view.context';
import { type PaneData } from '../state/view.types';
import { useStore } from 'jotai';
import { panesAtom } from '../state/view.atoms';

export const usePaneOpenChild = () => {
  const store = useStore();
  const currentPaneKey = useContext(PaneContext).key;
  const openChildPane = useCallback(
    (paneData: PaneData) => {
      const newPanes = store.get(panesAtom).map((pane) => {
        if (pane.key !== currentPaneKey) {
          return pane;
        }
        return { ...pane, child: paneData };
      });
      store.set(panesAtom, newPanes);
    },
    [currentPaneKey, store],
  );
  return openChildPane;
};
