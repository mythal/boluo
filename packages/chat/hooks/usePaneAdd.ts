import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { findNextPaneKey, panesAtom } from '../state/view.atoms';
import { insertPaneByPosition, NewPanePosition, Pane, PaneData } from '../state/view.types';

export const usePaneAdd = () => {
  const setPanes = useSetAtom(panesAtom);
  return useCallback((pane: PaneData, position: NewPanePosition = 'HEAD') =>
    setPanes((panes) => {
      const nextKey = findNextPaneKey(panes);
      const newPane: Pane = { ...pane, key: nextKey };
      return insertPaneByPosition(panes, newPane, position);
    }), [setPanes]);
};
