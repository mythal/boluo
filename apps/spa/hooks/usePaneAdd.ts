import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { findNextPaneKey, panesAtom } from '../state/view.atoms';
import { insertPaneByPosition, NewPanePosition, Pane, PaneData } from '../state/view.types';
import { usePaneLimit } from './useMaxPane';

export const usePaneAdd = () => {
  const setPanes = useSetAtom(panesAtom);
  const maxPane = usePaneLimit();
  return useCallback(
    (pane: PaneData, position: NewPanePosition = 'HEAD') =>
      setPanes((panes) => {
        if (maxPane === 1) {
          return [{ ...pane, key: 0 }];
        }
        const nextKey = findNextPaneKey(panes);
        const newPane: Pane = { ...pane, key: nextKey };
        return insertPaneByPosition(panes, newPane, position);
      }),
    [maxPane, setPanes],
  );
};
